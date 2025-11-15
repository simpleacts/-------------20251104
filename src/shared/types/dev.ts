import { Row } from './common';

// --- ID Management Tool ---
export interface IdFormat extends Row {
    table_name: string;
    prefix: string;
    padding: number;
    description: string;
    is_manufacturer_dependent?: boolean | number; // 0/1 (CSV) or true/false (TypeScript)
}

// --- Dev Lock Tool ---
export interface DevLock extends Row {
    id: string;
    // FIX: Add 'path' to the component_type to allow locking files/directories.
    component_type: 'tool' | 'table' | 'path';
    component_name: string;
    is_locked: boolean;
    lock_type: 'no_edit' | 'copy_on_edit';
    notes: string;
}

// --- Tool Migration Manager ---
export interface ToolMigration extends Row {
    id: string;
    tool_name: string;
    display_name: string;
    version: string;
    description: string;
    destination_app: string;
    migration_date: string;
    notes?: string;
}

// --- Development Management Tool ---
export interface DevRoadmapItem extends Row {
    id: string;
    parent_id?: string;
    title: string;
    description: string;
    instructions?: string;
    status: 'backlog' | 'todo' | 'in_progress' | 'done';
    created_at: string;
    completed_at: string | null;
    type: 'feature' | 'refactor' | 'bugfix' | 'chore';
    priority: number;
}

export interface GuidelineItem {
    id: string;
    title: string;
    content: string;
}

// --- Tool Dependency Manager ---
export interface ToolDependency extends Row {
    tool_name: string;
    table_name: string;
    read_fields: string; // comma-separated, or '*'
    write_fields: string; // comma-separated, or '*'
    allowed_operations?: string; // comma-separated: 'INSERT', 'UPDATE', 'DELETE', or '*' for all
    load_strategy: 'on_app_start' | 'on_tool_mount' | 'on_demand';
    load_condition?: string;
}

