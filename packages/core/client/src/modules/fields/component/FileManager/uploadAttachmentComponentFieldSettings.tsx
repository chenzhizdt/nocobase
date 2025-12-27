/**
 * This file is part of the NocoBase (R) project.
 * Copyright (c) 2020-2024 NocoBase Co., Ltd.
 * Authors: NocoBase Team.
 *
 * This project is dual-licensed under AGPL-3.0 and NocoBase Commercial License.
 * For more information, please refer to: https://www.nocobase.com/agreement.
 */

import { Field } from '@formily/core';
import { useField, useFieldSchema } from '@formily/react';
import { useTranslation } from 'react-i18next';
import { SchemaSettings } from '../../../../application/schema-settings/SchemaSettings';
import { useColumnSchema, useDesignable } from '../../../../schema-component';
import { useIsFieldReadPretty } from '../../../../schema-component/antd/form-item/FormItem.Settings';
import { showFileName, fileSizeSetting } from './fileManagerComponentFieldSettings';

const imageSizeModeOptions = [
  { label: "{{t('No limit')}}", value: 'none' },
  { label: "{{t('Exact size')}}", value: 'exact' },
  { label: "{{t('Maximum size')}}", value: 'max' },
  { label: "{{t('Minimum size')}}", value: 'min' },
];

const fileSizeUnitOptions = [
  { label: 'KB', value: 1024 },
  { label: 'MB', value: 1024 * 1024 },
];

export const uploadAttachmentComponentFieldSettings = new SchemaSettings({
  name: 'fieldSettings:component:Upload.Attachment',
  items: [
    {
      ...fileSizeSetting,
      useVisible() {
        const { fieldSchema: tableColumnSchema } = useColumnSchema();
        const isInTable = tableColumnSchema?.parent?.['x-component'] === 'TableV2.Column';
        const readPretty = useIsFieldReadPretty();
        return readPretty && !isInTable;
      },
    },
    showFileName,
    {
      name: 'divider1',
      type: 'divider',
      useVisible() {
        const readPretty = useIsFieldReadPretty();
        return !readPretty;
      },
    },
    {
      name: 'maxFileSize',
      type: 'modal',
      useVisible() {
        const readPretty = useIsFieldReadPretty();
        return !readPretty;
      },
      useComponentProps() {
        const { t } = useTranslation();
        const field = useField<Field>();
        const { fieldSchema: tableColumnSchema } = useColumnSchema();
        const schema = useFieldSchema();
        const fieldSchema = tableColumnSchema || schema;
        const { dn } = useDesignable();

        const currentMaxSize = fieldSchema['x-component-props']?.fileRules?.maxSize;
        const currentUnit = currentMaxSize >= 1024 * 1024 ? 1024 * 1024 : 1024;
        const currentValue = currentMaxSize ? currentMaxSize / currentUnit : undefined;

        return {
          title: t('File size limit'),
          schema: {
            type: 'object',
            properties: {
              maxFileSize: {
                type: 'number',
                title: t('Maximum file size'),
                'x-decorator': 'FormItem',
                'x-component': 'InputNumber',
                'x-component-props': {
                  min: 0,
                  addonAfter: {
                    type: 'void',
                    'x-component': 'Select',
                    'x-component-props': {
                      style: { width: 70 },
                      options: fileSizeUnitOptions,
                    },
                  },
                },
                default: currentValue,
                description: t('Leave empty to use storage default limit'),
              },
              unit: {
                type: 'number',
                title: t('Unit'),
                'x-decorator': 'FormItem',
                'x-component': 'Select',
                'x-component-props': {
                  options: fileSizeUnitOptions,
                },
                default: currentUnit,
              },
            },
          },
          onSubmit: ({ maxFileSize, unit }) => {
            const maxSize = maxFileSize && unit ? maxFileSize * unit : undefined;
            const componentProps = fieldSchema['x-component-props'] || {};
            const fileRules = componentProps.fileRules || {};

            if (maxSize) {
              fileRules.maxSize = maxSize;
            } else {
              delete fileRules.maxSize;
            }

            fieldSchema['x-component-props'] = {
              ...componentProps,
              fileRules: Object.keys(fileRules).length > 0 ? fileRules : undefined,
            };

            field.componentProps = fieldSchema['x-component-props'];

            dn.emit('patch', {
              schema: {
                ['x-uid']: fieldSchema['x-uid'],
                'x-component-props': fieldSchema['x-component-props'],
              },
            });
            dn.refresh();
          },
        };
      },
    },
    {
      name: 'imageSizeLimit',
      type: 'modal',
      useVisible() {
        const readPretty = useIsFieldReadPretty();
        return !readPretty;
      },
      useComponentProps() {
        const { t } = useTranslation();
        const field = useField<Field>();
        const { fieldSchema: tableColumnSchema } = useColumnSchema();
        const schema = useFieldSchema();
        const fieldSchema = tableColumnSchema || schema;
        const { dn } = useDesignable();

        const currentImageSize = fieldSchema['x-component-props']?.fileRules?.imageSize;

        return {
          title: t('Image size limit'),
          schema: {
            type: 'object',
            properties: {
              mode: {
                type: 'string',
                title: t('Limit type'),
                'x-decorator': 'FormItem',
                'x-component': 'Select',
                'x-component-props': {
                  options: imageSizeModeOptions,
                },
                default: currentImageSize?.mode || 'none',
              },
              width: {
                type: 'number',
                title: t('Width (px)'),
                'x-decorator': 'FormItem',
                'x-component': 'InputNumber',
                'x-component-props': {
                  min: 1,
                },
                'x-reactions': {
                  dependencies: ['mode'],
                  fulfill: {
                    state: {
                      visible: '{{$deps[0] !== "none"}}',
                    },
                  },
                },
                default: currentImageSize?.width,
              },
              height: {
                type: 'number',
                title: t('Height (px)'),
                'x-decorator': 'FormItem',
                'x-component': 'InputNumber',
                'x-component-props': {
                  min: 1,
                },
                'x-reactions': {
                  dependencies: ['mode'],
                  fulfill: {
                    state: {
                      visible: '{{$deps[0] !== "none"}}',
                    },
                  },
                },
                default: currentImageSize?.height,
              },
            },
          },
          onSubmit: ({ mode, width, height }) => {
            const componentProps = fieldSchema['x-component-props'] || {};
            const fileRules = componentProps.fileRules || {};

            if (mode && mode !== 'none' && width && height) {
              fileRules.imageSize = { mode, width, height };
            } else {
              delete fileRules.imageSize;
            }

            fieldSchema['x-component-props'] = {
              ...componentProps,
              fileRules: Object.keys(fileRules).length > 0 ? fileRules : undefined,
            };

            field.componentProps = fieldSchema['x-component-props'];

            dn.emit('patch', {
              schema: {
                ['x-uid']: fieldSchema['x-uid'],
                'x-component-props': fieldSchema['x-component-props'],
              },
            });
            dn.refresh();
          },
        };
      },
    },
  ],
});
