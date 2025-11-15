import React from 'react';
import { Row } from '../../types';
import { Select } from '../atoms/Select';

interface ImageAssignmentRowProps {
    imageName: string;
    imageSrc: string;
    assignedProductId: string;
    onAssignmentChange: (imageName: string, productId: string) => void;
    products: { id: string; name: string; code: string }[];
}

const ImageAssignmentRow: React.FC<ImageAssignmentRowProps> = ({ imageName, imageSrc, assignedProductId, onAssignmentChange, products }) => {
    return (
        <div className="flex items-center gap-4 p-2 bg-base-200 dark:bg-base-dark-300 rounded-md">
            <img src={imageSrc} alt={imageName} className="w-12 h-12 object-cover rounded-md flex-shrink-0" loading="lazy"/>
            <div className="flex-grow">
                <p className="text-xs text-gray-500 truncate" title={imageName}>{imageName}</p>
                <Select 
                    value={assignedProductId} 
                    onChange={e => onAssignmentChange(imageName, e.target.value)}
                >
                    <option value="">商品を選択...</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.code})</option>)}
                </Select>
            </div>
        </div>
    );
};

export default ImageAssignmentRow;
