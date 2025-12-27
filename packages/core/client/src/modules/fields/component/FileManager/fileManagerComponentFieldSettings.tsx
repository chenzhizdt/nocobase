/**
 * This file is part of the NocoBase (R) project.
 * Copyright (c) 2020-2024 NocoBase Co., Ltd.
 * Authors: NocoBase Team.
 *
 * This project is dual-licensed under AGPL-3.0 and NocoBase Commercial License.
 * For more information, please refer to: https://www.nocobase.com/agreement.
 */

import { Field } from '@formily/core';
import { useField, useFieldSchema, useForm } from '@formily/react';
import { useTranslation } from 'react-i18next';
import { SchemaSettings } from '../../../../application/schema-settings/SchemaSettings';
import { useFieldComponentName } from '../../../../common/useFieldComponentName';
import { useDesignable, useFieldModeOptions, useIsAddNewForm, useCompile } from '../../../../schema-component';
import { isSubMode } from '../../../../schema-component/antd/association-field/util';
import {
  useIsAssociationField,
  useIsFieldReadPretty,
} from '../../../../schema-component/antd/form-item/FormItem.Settings';
import { useColumnSchema } from '../../../../schema-component/antd/table-v2/Table.Column.Decorator';
import { useIsShowMultipleSwitch } from '../../../../schema-settings/hooks/useIsShowMultipleSwitch';
import { getAllowMultiple } from '../Select/selectComponentFieldSettings';

export const fileSizeOptions = [
  { label: "{{t('Large')}}", value: 'large' },
  { label: "{{t('Default')}}", value: 'default' },
  { label: "{{t('Small')}}", value: 'small' },
  { label: 500, value: 500 },
  { label: 400, value: 400 },
  { label: 300, value: 300 },
];

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

const fieldComponent: any = {
  name: 'fieldComponent',
  type: 'select',
  useComponentProps() {
    const { t } = useTranslation();
    const field = useField<Field>();
    const isAddNewForm = useIsAddNewForm();
    const fieldComponentName = useFieldComponentName();
    const { fieldSchema: tableColumnSchema, collectionField } = useColumnSchema();
    const schema = useFieldSchema();
    const fieldSchema = tableColumnSchema || schema;
    const fieldModeOptions = useFieldModeOptions({ fieldSchema: tableColumnSchema, collectionField });
    const { dn } = useDesignable();
    return {
      title: t('Field component'),
      options: fieldModeOptions,
      value: fieldComponentName,
      onChange(mode) {
        const schema = {
          ['x-uid']: fieldSchema['x-uid'],
        };
        fieldSchema['x-component-props'] = fieldSchema['x-component-props'] || {};
        fieldSchema['x-component-props']['mode'] = mode;
        schema['x-component-props'] = fieldSchema['x-component-props'];
        field.componentProps = field.componentProps || {};
        field.componentProps.mode = mode;

        // 子表单状态不允许设置默认值
        if (isSubMode(fieldSchema) && isAddNewForm) {
          // @ts-ignore
          schema.default = null;
          fieldSchema.default = null;
          field.setInitialValue(null);
          field.setValue(null);
        }

        void dn.emit('patch', {
          schema,
        });
        dn.refresh();
      },
    };
  },
};
export const fileSizeSetting: any = {
  name: 'size',
  type: 'select',
  useVisible() {
    const readPretty = useIsFieldReadPretty();
    const { fieldSchema: tableColumnSchema } = useColumnSchema();
    return readPretty && !tableColumnSchema;
  },
  useComponentProps() {
    const { t } = useTranslation();
    const field = useField<Field>();
    const fieldSchema = useFieldSchema();
    const { dn } = useDesignable();
    const compile = useCompile();
    return {
      title: t('Size'),
      options: compile(fileSizeOptions),
      value: field?.componentProps?.size || 'default',
      onChange(size) {
        const schema = {
          ['x-uid']: fieldSchema['x-uid'],
        };
        fieldSchema['x-component-props'] = fieldSchema['x-component-props'] || {};
        fieldSchema['x-component-props']['size'] = size;
        schema['x-component-props'] = fieldSchema['x-component-props'];
        field.componentProps = field.componentProps || {};
        field.componentProps.size = size;
        dn.emit('patch', {
          schema,
        });
        dn.refresh();
      },
    };
  },
};

export const showFileName: any = {
  name: 'showFileName',
  type: 'switch',
  useComponentProps() {
    const { t } = useTranslation();
    const field = useField<Field>();
    const { fieldSchema: tableColumnSchema } = useColumnSchema();
    const schema = useFieldSchema();
    const fieldSchema = tableColumnSchema || schema;
    const { dn, refresh } = useDesignable();
    return {
      title: t('Show file name'),
      checked: fieldSchema['x-component-props']?.showFileName !== (false as boolean),
      onChange(value) {
        const schema = {
          ['x-uid']: fieldSchema['x-uid'],
        };
        field.componentProps.showFileName = value;
        fieldSchema['x-component-props'] = fieldSchema['x-component-props'] || {};
        fieldSchema['x-component-props'].showFileName = value;
        schema['x-component-props'] = fieldSchema['x-component-props'];
        dn.emit('patch', {
          schema,
        });
        refresh();
      },
    };
  },
};

export const fileManagerComponentFieldSettings = new SchemaSettings({
  name: 'fieldSettings:component:FileManager',
  items: [
    fieldComponent,
    {
      name: 'quickUpload',
      type: 'switch',
      useComponentProps() {
        const { t } = useTranslation();
        const field = useField<Field>();
        const { fieldSchema: tableColumnSchema } = useColumnSchema();
        const schema = useFieldSchema();
        const fieldSchema = tableColumnSchema || schema;
        const { dn, refresh } = useDesignable();
        return {
          title: t('Quick upload'),
          checked: fieldSchema['x-component-props']?.quickUpload !== (false as boolean),
          onChange(value) {
            const schema = {
              ['x-uid']: fieldSchema['x-uid'],
            };
            field.componentProps.quickUpload = value;
            fieldSchema['x-component-props'] = fieldSchema['x-component-props'] || {};
            fieldSchema['x-component-props'].quickUpload = value;
            schema['x-component-props'] = fieldSchema['x-component-props'];
            dn.emit('patch', {
              schema,
            });
            refresh();
          },
        };
      },
      useVisible() {
        const { fieldSchema: tableColumnSchema } = useColumnSchema();
        const field = useField();
        const form = useForm();
        const isReadPretty = tableColumnSchema?.['x-read-pretty'] || field.readPretty || form.readPretty;
        return !isReadPretty;
      },
    },
    {
      name: 'selectFile',
      type: 'switch',
      useComponentProps() {
        const { t } = useTranslation();
        const field = useField<Field>();
        const { fieldSchema: tableColumnSchema } = useColumnSchema();
        const schema = useFieldSchema();
        const fieldSchema = tableColumnSchema || schema;
        const { dn, refresh } = useDesignable();
        return {
          title: t('Select file'),
          checked: fieldSchema['x-component-props']?.selectFile !== (false as boolean),
          onChange(value) {
            const schema = {
              ['x-uid']: fieldSchema['x-uid'],
            };
            field.componentProps.selectFile = value;
            fieldSchema['x-component-props'] = fieldSchema['x-component-props'] || {};
            fieldSchema['x-component-props'].selectFile = value;
            schema['x-component-props'] = fieldSchema['x-component-props'];
            dn.emit('patch', {
              schema,
            });
            refresh();
          },
        };
      },
      useVisible() {
        const { fieldSchema: tableColumnSchema } = useColumnSchema();
        const field = useField();
        const form = useForm();
        const isReadPretty = tableColumnSchema?.['x-read-pretty'] || field.readPretty || form.readPretty;
        return !isReadPretty;
      },
    },
    fileSizeSetting,
    showFileName,
    {
      ...getAllowMultiple(),
      useVisible() {
        const isAssociationField = useIsAssociationField();
        const IsShowMultipleSwitch = useIsShowMultipleSwitch();
        return isAssociationField && IsShowMultipleSwitch();
      },
    },
    {
      name: 'divider1',
      type: 'divider',
      useVisible() {
        const { fieldSchema: tableColumnSchema } = useColumnSchema();
        const field = useField();
        const form = useForm();
        const isReadPretty = tableColumnSchema?.['x-read-pretty'] || field.readPretty || form.readPretty;
        return !isReadPretty;
      },
    },
    {
      name: 'maxFileSize',
      type: 'modal',
      useVisible() {
        const { fieldSchema: tableColumnSchema } = useColumnSchema();
        const field = useField();
        const form = useForm();
        const isReadPretty = tableColumnSchema?.['x-read-pretty'] || field.readPretty || form.readPretty;
        return !isReadPretty;
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
        const unitLabel = currentUnit === 1024 * 1024 ? 'MB' : 'KB';

        // 生成显示文本
        const displayValue = currentMaxSize ? `${currentValue} ${unitLabel}` : t('Not set');

        return {
          title: t('File size limit'),
          children: displayValue,
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
        const { fieldSchema: tableColumnSchema } = useColumnSchema();
        const field = useField();
        const form = useForm();
        const isReadPretty = tableColumnSchema?.['x-read-pretty'] || field.readPretty || form.readPretty;
        return !isReadPretty;
      },
      useComponentProps() {
        const { t } = useTranslation();
        const field = useField<Field>();
        const { fieldSchema: tableColumnSchema } = useColumnSchema();
        const schema = useFieldSchema();
        const fieldSchema = tableColumnSchema || schema;
        const { dn } = useDesignable();

        const currentImageSize = fieldSchema['x-component-props']?.fileRules?.imageSize;

        // 生成显示文本
        let displayValue = t('Not set');
        if (currentImageSize && currentImageSize.mode !== 'none' && currentImageSize.width && currentImageSize.height) {
          const modeLabels: Record<string, string> = {
            exact: t('Exact size'),
            max: t('Maximum size'),
            min: t('Minimum size'),
          };
          displayValue = `${modeLabels[currentImageSize.mode] || currentImageSize.mode}: ${currentImageSize.width}×${
            currentImageSize.height
          }`;
        }

        return {
          title: t('Image size limit'),
          children: displayValue,
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
