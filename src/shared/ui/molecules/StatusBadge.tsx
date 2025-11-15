import React from 'react';
import { Badge, BadgeProps } from '../atoms/Badge';

interface StatusBadgeProps extends Omit<BadgeProps, 'variant'> {
  status: string;
  labels?: Record<string, string>;
  colorMap?: Record<string, BadgeProps['variant']>;
}

const getStatusVariant = (status: string, colorMap?: Record<string, BadgeProps['variant']>): BadgeProps['variant'] => {
  const lowerStatus = String(status || '').toLowerCase();
  if (colorMap && colorMap[lowerStatus]) {
    return colorMap[lowerStatus];
  }
  if (['active', 'paid', 'completed', 'sent', 'はい', 'アクティブ', '公開'].includes(lowerStatus)) return 'default';
  if (['inactive', 'pending', 'in_progress', '休眠', '対応中', '未対応', '非公開'].includes(lowerStatus)) return 'secondary';
  if (['suspended', 'overdue', 'error', 'failed', 'いいえ', '取引停止'].includes(lowerStatus)) return 'destructive';
  return 'outline';
};

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, labels, colorMap, ...props }) => {
  const label = labels?.[status] || status;
  const variant = getStatusVariant(status, colorMap);

  return <Badge variant={variant} {...props}>{label}</Badge>;
};

export default StatusBadge;
