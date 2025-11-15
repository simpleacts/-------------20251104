import React, { useEffect } from 'react';
import { StructuredDataProps } from '../types';

let scriptCount = 0;

export const StructuredData: React.FC<StructuredDataProps> = ({ schema }) => {
    useEffect(() => {
        const scriptId = `structured-data-json-ld-${scriptCount++}`;
        const script = document.createElement('script');
        script.id = scriptId;
        script.type = 'application/ld+json';
        script.innerHTML = JSON.stringify(schema);

        document.head.appendChild(script);

        return () => {
            const scriptToRemove = document.getElementById(scriptId);
            if (scriptToRemove) {
                document.head.removeChild(scriptToRemove);
            }
        };
    }, [schema]);

    return null;
};