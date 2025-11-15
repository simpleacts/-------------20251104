import { Row } from './common';

export interface ToolVisibility extends Row {
    tool_name: string;
    device_type: 'desktop' | 'tablet' | 'mobile';
    is_visible: boolean;
}

export interface MobileToolMapping extends Row {
    mobile_tool_name: string;
    desktop_tool_name: string;
}

