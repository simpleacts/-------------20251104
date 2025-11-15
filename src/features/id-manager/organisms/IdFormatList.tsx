import React from 'react';
import { IdFormat } from '@shared/types';
import { useTranslation } from '@shared/hooks/useTranslation';
import IdFormatDisplayRow from '../molecules/IdFormatDisplayRow';

interface IdFormatListProps {
    idFormats: Partial<IdFormat>[];
    TABLE_DISPLAY_NAMES: Record<string, string>;
}

const IdFormatList: React.FC<IdFormatListProps> = ({ idFormats, TABLE_DISPLAY_NAMES }) => {
    const { t } = useTranslation('id-manager');
    
    return (
    <div className="flex-grow overflow-auto">
        <table className="min-w-full text-sm">
            <thead className="bg-base-200 dark:bg-base-dark-300 sticky top-0">
                <tr>
                    <th className="p-2 text-left">{t('id_format_list.table', 'テーブル')}</th>
                    <th className="p-2 text-left">{t('id_format_list.prefix', 'プレフィックス')}</th>
                    <th className="p-2 text-left">{t('id_format_list.padding', '桁数 (パディング)')}</th>
                    <th className="p-2 text-left">{t('id_format_list.manufacturer_dependent', 'メーカー依存')}</th>
                    <th className="p-2 text-left">{t('id_format_list.example', '生成例')}</th>
                </tr>
            </thead>
            <tbody>
                {idFormats.map(format => (
                    <IdFormatDisplayRow key={format.table_name} format={format} TABLE_DISPLAY_NAMES={TABLE_DISPLAY_NAMES} />
                ))}
            </tbody>
        </table>
    </div>
    );
};

export default IdFormatList;