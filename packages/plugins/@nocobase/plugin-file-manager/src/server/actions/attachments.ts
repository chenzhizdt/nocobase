/**
 * This file is part of the NocoBase (R) project.
 * Copyright (c) 2020-2024 NocoBase Co., Ltd.
 * Authors: NocoBase Team.
 *
 * This project is dual-licensed under AGPL-3.0 and NocoBase Commercial License.
 * For more information, please refer to: https://www.nocobase.com/agreement.
 */

import { Context, Next } from '@nocobase/actions';
import { koaMulter as multer } from '@nocobase/utils';
import Path from 'path';

import Plugin from '..';
import { FILE_FIELD_NAME, FILE_SIZE_LIMIT_DEFAULT, FILE_SIZE_LIMIT_MIN, LIMIT_FILES } from '../../constants';
import * as Rules from '../rules';
import { StorageClassType } from '../storages';

// Security: Validate and sanitize filenames to prevent path traversal
function sanitizeFilename(filename: string): string {
  if (!filename || typeof filename !== 'string') {
    throw new Error('Invalid filename');
  }
  
  // Remove path traversal patterns
  const cleaned = filename
    .replace(/\.\./g, '') // Remove .. sequences
    .replace(/[\/\\]/g, '') // Remove path separators
    .replace(/[\x00-\x1f\x80-\x9f]/g, '') // Remove control characters
    .replace(/^\.+/, '') // Remove leading dots
    .trim();
  
  if (cleaned.length === 0) {
    throw new Error('Invalid filename after sanitization');
  }
  
  if (cleaned.length > 255) {
    throw new Error('Filename too long');
  }
  
  // Check for dangerous file extensions
  const dangerousExtensions = [
    '.exe', '.bat', '.cmd', '.com', '.pif', '.scr', '.vbs', '.js', '.jar',
    '.php', '.asp', '.aspx', '.jsp', '.sh', '.ps1', '.py', '.rb', '.pl'
  ];
  
  const ext = Path.extname(cleaned).toLowerCase();
  if (dangerousExtensions.includes(ext)) {
    throw new Error('Dangerous file extension not allowed');
  }
  
  return cleaned;
}

// TODO(optimize): 需要优化错误处理，计算失败后需要抛出对应错误，以便程序处理
function getFileFilter(storage) {
  return (req, file, cb) => {
    try {
      // Security: Validate and sanitize filename
      file.originalname = sanitizeFilename(file.originalname);
      
      // size 交给 limits 处理
      const { size, ...rules } = storage.rules;
      const ruleKeys = Object.keys(rules);
      const result =
        !ruleKeys.length || !ruleKeys.some((key) => typeof Rules[key] !== 'function' || !Rules[key](file, rules[key]));
      cb(null, result);
    } catch (error) {
      cb(error, false);
    }
  };
}

async function multipart(ctx: Context, next: Next) {
  const { storage } = ctx;
  if (!storage) {
    ctx.logger.error('[file-manager] no linked or default storage provided');
    return ctx.throw(500);
  }

  const StorageType = ctx.app.pm.get(Plugin).storageTypes.get(storage.type) as StorageClassType;
  if (!StorageType) {
    ctx.logger.error(`[file-manager] storage type "${storage.type}" is not defined`);
    return ctx.throw(500);
  }
  const storageInstance = new StorageType(storage);

  const multerOptions = {
    fileFilter: getFileFilter(storage),
    limits: {
      // 每次只允许提交一个文件
      files: LIMIT_FILES,
    },
    storage: storageInstance.make(),
  };
  multerOptions.limits['fileSize'] = Math.max(FILE_SIZE_LIMIT_MIN, storage.rules.size ?? FILE_SIZE_LIMIT_DEFAULT);

  const upload = multer(multerOptions).single(FILE_FIELD_NAME);
  try {
    // NOTE: empty next and invoke after success
    await upload(ctx, () => {});
  } catch (err) {
    if (err.name === 'MulterError') {
      return ctx.throw(400, err);
    }
    ctx.logger.error(err);
    return ctx.throw(500, err);
  }

  const { [FILE_FIELD_NAME]: file } = ctx;
  if (!file) {
    return ctx.throw(400, 'file validation failed');
  }

  const values = storageInstance.getFileData(file, ctx.request.body);

  ctx.action.mergeParams({
    values,
  });

  await next();
}

export async function createMiddleware(ctx: Context, next: Next) {
  const { resourceName, actionName } = ctx.action;
  const { attachmentField } = ctx.action.params;
  const collection = ctx.db.getCollection(resourceName);

  if (collection?.options?.template !== 'file' || !['upload', 'create'].includes(actionName)) {
    return next();
  }

  const storageName =
    resourceName === 'attachments'
      ? ctx.db.getFieldByPath(attachmentField)?.options?.storage
      : collection.options.storage;
  // const StorageRepo = ctx.db.getRepository('storages');
  // const storage = await StorageRepo.findOne({ filter: storageName ? { name: storageName } : { default: true } });
  const plugin = ctx.app.pm.get(Plugin) as Plugin;
  const storage = Array.from(plugin.storagesCache.values()).find((storage) =>
    storageName ? storage.name === storageName : storage.default,
  );
  if (!storage) {
    ctx.logger.error(`[file-manager] no storage found`);
    return ctx.throw(500);
  }
  ctx.storage = storage;

  if (ctx?.request.is('multipart/*')) {
    await multipart(ctx, next);
  } else {
    ctx.action.mergeParams({
      values: {
        storage: { id: storage.id },
      },
    });
    await next();
  }
}
