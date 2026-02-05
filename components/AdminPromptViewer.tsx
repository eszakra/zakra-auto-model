import React from 'react';

interface AdminPromptViewerProps {
    prompt: string;
}

const AdminPromptViewer: React.FC<AdminPromptViewerProps> = ({ prompt }) => {
    if (!prompt) return null;

    return (
        <div className="text-xs text-[var(--text-primary)] font-mono leading-relaxed bg-[var(--bg-secondary)] p-3 border border-[var(--border-color)] rounded-lg max-h-40 overflow-y-auto">
            {prompt.startsWith('{') ? (
                (() => {
                    try {
                        const parsed = JSON.parse(prompt);
                        return (
                            <div className="space-y-2">
                                {parsed.contents?.[0]?.parts?.[0]?.text && (
                                    <div>
                                        <span className="text-reed-red font-semibold">Main Prompt:</span>
                                        <p className="mt-1 text-[var(--text-secondary)]">{parsed.contents[0].parts[0].text}</p>
                                    </div>
                                )}
                                <details className="mt-2">
                                    <summary className="cursor-pointer text-[var(--text-muted)] hover:text-[var(--text-primary)]">View Full JSON</summary>
                                    <pre className="mt-2 text-[10px] text-[var(--text-muted)] whitespace-pre-wrap">{JSON.stringify(parsed, null, 2)}</pre>
                                </details>
                            </div>
                        );
                    } catch {
                        return <pre className="whitespace-pre-wrap">{prompt}</pre>;
                    }
                })()
            ) : (
                <p className="whitespace-pre-wrap">{prompt}</p>
            )}
        </div>
    );
};

export default AdminPromptViewer;
