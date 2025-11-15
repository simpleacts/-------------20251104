import React, { createContext, useContext, useMemo } from 'react';
import { useDatabase } from '@core/contexts/DatabaseContext';
import { Row } from '../../types';

interface IconContextType {
    getIconSvg: (name: string) => string | undefined;
}

const IconContext = createContext<IconContextType | undefined>(undefined);

export const IconProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { database } = useDatabase();

    const iconMap = useMemo(() => {
        const map = new Map<string, string>();
        if (database?.icons) {
            database.icons.data.forEach((icon: Row) => {
                map.set(icon.name as string, icon.svg_content as string);
            });
        }
        return map;
    }, [database?.icons]);

    const getIconSvg = (name: string) => iconMap.get(name);

    return (
        <IconContext.Provider value={{ getIconSvg }}>
            {children}
        </IconContext.Provider>
    );
};

const useIcon = (name: string) => {
    const context = useContext(IconContext);
    if (!context) {
        // This might happen on initial render before database is ready.
        // It's a temporary state, so returning null is acceptable.
        return null;
    }
    return context.getIconSvg(name);
};

const Icon: React.FC<{ name: string; title?: string } & React.SVGProps<SVGSVGElement>> = ({ name, title, ...props }) => {
    const svgContent = useIcon(name);
    const fallbackSvg = '<path d="M12 2 L2 22 L22 22 Z" fill-rule="evenodd" clip-rule="evenodd" />';

    return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
            {title && <title>{title}</title>}
            <g dangerouslySetInnerHTML={{ __html: svgContent || fallbackSvg }} />
        </svg>
    );
};

export const PencilIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => <Icon name="pencil" {...props} />;
export const TrashIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => <Icon name="trash" {...props} />;
export const DuplicateIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => <Icon name="duplicate" {...props} />;
export const CheckIcon: React.FC<React.SVGProps<SVGSVGElement> & { title?: string }> = (props) => <Icon name="check" {...props} />;
export const XMarkIcon: React.FC<React.SVGProps<SVGSVGElement> & { title?: string }> = (props) => <Icon name="x-mark" {...props} />;
export const PencilSquareIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => <Icon name="pencil-square" {...props} />;
export const SparklesIcon: React.FC<React.SVGProps<SVGSVGElement> & { title?: string }> = (props) => <Icon name="sparkles" {...props} />;
export const SpinnerIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => <svg className="animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" {...props} dangerouslySetInnerHTML={{ __html: useIcon('spinner') || '' }} />;
export const PaperAirplaneIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => <Icon name="paper-airplane" {...props} />;
export const PaperclipIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => <Icon name="paperclip" {...props} />;
export const ClipboardDocumentCheckIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => <Icon name="clipboard-document-check" {...props} />;
export const ChevronDownIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => <Icon name="chevron-down" {...props} />;
export const ChevronLeftIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => <Icon name="chevron-left" {...props} />;
export const ChevronRightIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => <Icon name="chevron-right" {...props} />;
export const WrenchScrewdriverIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => <Icon name="wrench-screwdriver" {...props} />;
export const UploadIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => <Icon name="upload" {...props} />;
export const DownloadIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => <Icon name="download" {...props} />;
export const ViewGridIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => <Icon name="view-grid" {...props} />;
export const ViewListIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => <Icon name="view-list" {...props} />;
export const PlusIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => <Icon name="plus" {...props} />;
export const PhotoIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => <Icon name="photo" {...props} />;
export const EyeIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => <Icon name="eye" {...props} />;
export const EyeSlashIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => <Icon name="eye-slash" {...props} />;
export const MagnifyingGlassIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => <Icon name="magnifying-glass" {...props} />;
export const LockClosedIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => <Icon name="lock-closed" {...props} />;
export const LockOpenIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => <Icon name="lock-open" {...props} />;
export const ArrowUturnLeftIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => <Icon name="arrow-uturn-left" {...props} />;
export const ArrowUturnRightIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => <Icon name="arrow-uturn-right" {...props} />;
export const Bars2Icon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => <Icon name="bars-2" {...props} />;
export const ArrowPathIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => <Icon name="arrow-path" {...props} />;
export const PrinterIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => <Icon name="printer" {...props} />;
export const UserCircleIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => <Icon name="user-circle" {...props} />;
export const ArchiveBoxIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => <Icon name="archive-box" {...props} />;
export const ArchiveBoxArrowDownIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => <Icon name="archive-box-arrow-down" {...props} />;
export const CurrencyYenIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => <Icon name="currency-yen" {...props} />;
export const QuestionMarkCircleIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => <Icon name="question-mark-circle" {...props} />;
export const PlayIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => <Icon name="play" {...props} />;
export const StopIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => <Icon name="stop" {...props} />;
export const MicrophoneIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => <Icon name="microphone" {...props} />;
export const TimerIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => <Icon name="timer" {...props} />;
export const ExclamationTriangleIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => <Icon name="exclamation-triangle" {...props} />;
export const CodeBracketIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => <Icon name="code-bracket" {...props} />;
export const BugIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => <Icon name="bug" {...props} />;
export const InformationCircleIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => <Icon name="information-circle" {...props} />;