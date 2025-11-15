import React from 'react';
import { IdFormat } from '@shared/types';

interface IdFormatPreviewProps {
  format: Partial<IdFormat>;
}

const IdFormatPreview: React.FC<IdFormatPreviewProps> = ({ format }) => {
  const { table_name, prefix, padding } = format;
  const exampleNumber = '1';
  let exampleId = '';

  if ((table_name === 'quotes' || table_name === 'bills') && (padding || 0) > 8) {
    const seqPadding = (padding || 14) - 9; // YYYYMMDD_ の9文字を引く
    exampleId = `${prefix || ''}YYYYMMDD_${'1'.padStart(seqPadding, '0')}`;
  } else {
    exampleId = `${prefix || ''}${exampleNumber.padStart(padding || 0, '0')}`;
  }

  return (
    <span className="font-mono text-sm text-gray-600 dark:text-gray-400">{exampleId}</span>
  );
};

export default IdFormatPreview;
