/**
 * This file is part of the NocoBase (R) project.
 * Copyright (c) 2020-2024 NocoBase Co., Ltd.
 * Authors: NocoBase Team.
 *
 * This project is dual-licensed under AGPL-3.0 and NocoBase Commercial License.
 * For more information, please refer to: https://www.nocobase.com/agreement.
 */

import { isArr, isValid, toArr as toArray } from '@formily/shared';
import { UploadFile } from 'antd/es/upload/interface';
import mime from 'mime';
import match from 'mime-match';
import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAPIClient } from '../../../api-client';
import { UNKNOWN_FILE_ICON, UPLOAD_PLACEHOLDER } from './placeholder';
import type { IUploadProps, UploadProps } from './type';

export const FILE_SIZE_LIMIT_DEFAULT = 1024 * 1024 * 20;

export interface FileModel {
  id: number;
  filename: string;
  path: string;
  title: string;
  url: string;
  extname: string;
  size: number;
  mimetype: string;
}

export interface PreviewerProps {
  index: number;
  list: FileModel[];
  onSwitchIndex(index): void;
}

export interface AttachmentFileType {
  match(file: any): boolean;
  getThumbnailURL?(file: any): string;
  ThumbnailPreviewer?: React.ComponentType<{ file: FileModel }>;
  Previewer?: React.ComponentType<PreviewerProps>;
}

export class AttachmentFileTypes {
  types: AttachmentFileType[] = [];
  add(type: AttachmentFileType) {
    // NOTE: use unshift to make sure the custom type has higher priority
    this.types.unshift(type);
  }
  getTypeByFile(file): Omit<AttachmentFileType, 'match'> {
    return this.types.find((type) => type.match(file));
  }
}

/**
 * @experimental
 */
export const attachmentFileTypes = new AttachmentFileTypes();

export function matchMimetype(file: FileModel | UploadFile<any>, type: string) {
  if (!file) {
    return false;
  }
  if ((<UploadFile>file).originFileObj) {
    return match((<UploadFile>file).type, type);
  }
  if ((<FileModel>file).mimetype) {
    return match((<FileModel>file).mimetype, type);
  }
  if (file.url) {
    const [fileUrl] = file.url.split('?');
    return match(mime.getType(fileUrl) || '', type);
  }
  return false;
}

const toArr = (value) => {
  if (!isValid(value)) {
    return [];
  }
  if (Object.keys(value).length === 0) {
    return [];
  }
  return toArray(value);
};

const testOpts = (ext: RegExp, options: { exclude?: string[]; include?: string[] }) => {
  if (options && isArr(options.include)) {
    return options.include.some((url) => ext.test(url));
  }

  if (options && isArr(options.exclude)) {
    return !options.exclude.some((url) => ext.test(url));
  }

  return true;
};

export function getThumbnailPlaceholderURL(file, options: any = {}) {
  for (let i = 0; i < UPLOAD_PLACEHOLDER.length; i++) {
    const url = file.url
      ? new URL(
          file.url.startsWith('http://') || file.url.startsWith('https://')
            ? file.url
            : `${location.origin}/${file.url.replace(/^\//, '')}`,
        )
      : { pathname: file.filename };

    if (UPLOAD_PLACEHOLDER[i].ext.test(file.extname || file.filename || url.pathname || file.name)) {
      if (testOpts(UPLOAD_PLACEHOLDER[i].ext, options)) {
        return UPLOAD_PLACEHOLDER[i].icon || UNKNOWN_FILE_ICON;
      } else {
        return file.name;
      }
    }
  }
  return UNKNOWN_FILE_ICON;
}

export function getResponseMessage({ error, response }: UploadFile<any>) {
  if (error instanceof Error && 'isAxiosError' in error) {
    // @ts-ignore
    if (error.response) {
      // @ts-ignore
      return error.response.data?.errors?.map?.((item) => item?.message).join(', ');
    } else {
      return error.message;
    }
  }
  if (!response) {
    return '';
  }
  if (typeof response === 'string') {
    return response;
  }
  const { errors } = response.data ?? {};
  if (!errors?.length) {
    return '';
  }
  return errors.map((item) => item?.message).join(', ');
}

export function normalizeFile(file: UploadFile & Record<string, any>) {
  const response = getResponseMessage(file);
  return {
    ...file,
    title: file.name,
    response,
  };
}

export function useUploadProps<T extends IUploadProps = UploadProps>(props: T) {
  const api = useAPIClient();

  return {
    // in customRequest method can't modify form's status(e.g: form.disabled=true )
    // that will be trigger Upload component（actual Underlying is AjaxUploader component ）'s  componentWillUnmount method
    // which will cause multiple files upload fail
    customRequest({ action, data, file, filename, headers, onError, onProgress, onSuccess, withCredentials }) {
      const formData = new FormData();
      if (data) {
        Object.keys(data).forEach((key) => {
          formData.append(key, data[key]);
        });
      }
      formData.append(filename, file);
      // eslint-disable-next-line promise/catch-or-return
      api.axios
        .post(action, formData, {
          withCredentials,
          headers,
          onUploadProgress: ({ total, loaded }) => {
            onProgress({ percent: Math.round((loaded / total) * 100).toFixed(2) }, file);
          },
        })
        .then(({ data }) => {
          onSuccess(data, file);
        })
        .catch(onError)
        .finally(() => {});

      return {
        abort() {
          console.log('upload progress is aborted.');
        },
      };
    },
    ...props,
  };
}

export function toValueItem(data) {
  return data;
}

export const toItem = (file) => {
  if (typeof file === 'string') {
    return {
      url: file,
    };
  }
  if (file?.response?.data) {
    file = {
      uid: file.uid,
      ...file.response.data,
    };
  }
  const result = {
    ...file,
    id: file.id || file.uid,
    title: file.title || file.name,
  };
  if (file.url) {
    result.url =
      file.url.startsWith('https://') || file.url.startsWith('http://')
        ? file.url
        : `${location.origin}/${file.url.replace(/^\//, '')}`;
  }
  return result;
};

export const toFileList = (fileList: any) => {
  return toArr(fileList).filter(Boolean).map(toItem);
};

type RuleFunction = (file: UploadFile, options: any) => string | null | Promise<string | null>;

export interface ImageSizeRule {
  mode: 'none' | 'exact' | 'max' | 'min';
  width?: number;
  height?: number;
}

export interface FileRules {
  maxSize?: number;
  imageSize?: ImageSizeRule;
}

export interface ValidationError {
  message: string;
  params?: Record<string, any>;
}

function getImageDimensions(file: UploadFile): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(img.src);
      resolve({ width: img.width, height: img.height });
    };
    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      reject(new Error('Failed to load image'));
    };
    if (file.originFileObj) {
      img.src = URL.createObjectURL(file.originFileObj);
    } else if ((file as any) instanceof File) {
      img.src = URL.createObjectURL(file as any);
    } else {
      reject(new Error('No file object available'));
    }
  });
}

const Rules: Record<string, RuleFunction> = {
  size(file, options: number): null | string {
    const size = options ?? FILE_SIZE_LIMIT_DEFAULT;
    if (size === 0) {
      return null;
    }
    return file.size <= size ? null : 'File size exceeds the limit';
  },
  mimetype(file, options: string | string[] = '*'): null | string {
    const pattern = options.toString().trim();
    if (!pattern || pattern === '*') {
      return null;
    }
    return pattern.split(',').filter(Boolean).some(match(file.type)) ? null : 'File type is not allowed';
  },
  maxSize(file, options: number): null | string {
    if (!options || options <= 0) {
      return null;
    }
    return file.size <= options ? null : 'File size exceeds the limit';
  },
  async imageSize(file, options: ImageSizeRule): Promise<null | string> {
    if (!options || options.mode === 'none' || !options.width || !options.height) {
      return null;
    }
    // Only check image files
    const fileType = (file as any).type || file.originFileObj?.type;
    if (!fileType?.startsWith('image/')) {
      return null;
    }
    try {
      const { width, height } = await getImageDimensions(file);
      const { mode, width: targetWidth, height: targetHeight } = options;

      switch (mode) {
        case 'exact':
          if (width !== targetWidth || height !== targetHeight) {
            return JSON.stringify({
              key: 'Image must be exactly {{target}}px (current: {{current}}px)',
              params: { target: `${targetWidth}×${targetHeight}`, current: `${width}×${height}` },
            });
          }
          break;
        case 'max':
          if (width > targetWidth || height > targetHeight) {
            return JSON.stringify({
              key: 'Image must not exceed {{target}}px (current: {{current}}px)',
              params: { target: `${targetWidth}×${targetHeight}`, current: `${width}×${height}` },
            });
          }
          break;
        case 'min':
          if (width < targetWidth || height < targetHeight) {
            return JSON.stringify({
              key: 'Image must be at least {{target}}px (current: {{current}}px)',
              params: { target: `${targetWidth}×${targetHeight}`, current: `${width}×${height}` },
            });
          }
          break;
      }
      return null;
    } catch {
      // If we can't read the image, skip the check
      return null;
    }
  },
};

export async function validate(file, rules: Record<string, any>): Promise<string | null> {
  if (!rules) {
    return null;
  }
  const ruleKeys = Object.keys(rules);
  if (!ruleKeys.length) {
    return null;
  }
  for (const key of ruleKeys) {
    const ruleFn = Rules[key];
    if (!ruleFn) {
      continue;
    }
    const error = await ruleFn(file, rules[key]);
    if (error) {
      return error;
    }
  }
  return null;
}

export function useBeforeUpload(rules) {
  const { t } = useTranslation();

  return useCallback(
    async (file, fileList) => {
      let proxiedFile = file;
      if (!file.type) {
        const extname = file.name?.match(/\.[^.]+$/)?.[0];
        if (extname) {
          proxiedFile = new File([file], file.name, {
            type: mime.getType(extname) || 'application/octet-stream',
            lastModified: file.lastModified,
          });
        }
      }
      const error = await validate(proxiedFile, rules);

      if (error) {
        file.status = 'error';
        // Handle parameterized error messages (JSON format)
        try {
          const parsed = JSON.parse(error);
          if (parsed.key && parsed.params) {
            file.response = t(parsed.key, parsed.params);
          } else {
            file.response = t(error);
          }
        } catch {
          file.response = t(error);
        }
        return false;
      } else {
        if (file.status === 'error') {
          delete proxiedFile.status;
          delete proxiedFile.response;
        }
      }
      return Promise.resolve(proxiedFile);
    },
    [rules, t],
  );
}
