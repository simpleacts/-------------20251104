import React, { useState } from 'react';
import { SparklesIcon } from '../atoms/icons';
import { Button } from '../atoms/Button';
import { Textarea } from '../atoms/Textarea';
import Spinner from '../atoms/Spinner';

interface AIQueryFormProps {
    onQuerySubmit: (query: string) => void;
    isLoading: boolean;
    placeholder?: string;
    buttonText?: string;
}

const AIQueryForm: React.FC<AIQueryFormProps> = ({ onQuerySubmit, isLoading, placeholder, buttonText }) => {
    const [query, setQuery] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (query.trim()) {
            onQuerySubmit(query);
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            <Textarea
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={placeholder || "AIへの指示を入力..."}
                className="h-24"
                disabled={isLoading}
            />
            <Button
                type="submit"
                className="mt-3 w-full"
                disabled={isLoading || !query.trim()}
            >
                {isLoading ? (
                    <>
                        <Spinner size="sm" className="mr-2" />
                        処理中...
                    </>
                ) : (
                    <>
                        <SparklesIcon className="w-5 h-5 mr-2" />
                        {buttonText || '実行'}
                    </>
                )}
            </Button>
        </form>
    );
};

export default AIQueryForm;