import { useEffect, useRef } from 'react';

/**
 * ブラウザの戻る・進むボタンに対応するためのフック
 * 状態遷移を履歴に追加し、popstateイベントで状態を復元します
 * 
 * @param state 現在の状態（履歴に保存される）
 * @param onStateChange 状態が変更されたときのコールバック（popstateイベント時）
 */
export const useBrowserHistory = <T extends Record<string, any>>(
    state: T,
    onStateChange: (state: T | null) => void
) => {
    const isInitialMount = useRef(true);
    const isPopState = useRef(false);
    const previousStateRef = useRef<T>(state);

    // ブラウザの戻る・進むボタンに対応
    useEffect(() => {
        const handlePopState = (event: PopStateEvent) => {
            isPopState.current = true;
            const historyState = event.state as T | null;
            onStateChange(historyState);
        };

        window.addEventListener('popstate', handlePopState);
        return () => {
            window.removeEventListener('popstate', handlePopState);
        };
    }, [onStateChange]);

    // 状態が変更されたときに履歴に追加
    useEffect(() => {
        // 状態が変更されていない場合は何もしない
        if (JSON.stringify(state) === JSON.stringify(previousStateRef.current)) {
            return;
        }

        previousStateRef.current = state;

        // 初回マウント時はreplaceStateで現在の状態を履歴に追加
        if (isInitialMount.current) {
            isInitialMount.current = false;
            window.history.replaceState(state, '', window.location.href);
            return;
        }

        // popstateイベント時は履歴に追加しない（既に履歴から復元されているため）
        if (isPopState.current) {
            isPopState.current = false;
            return;
        }

        // 通常の遷移時は履歴に追加
        window.history.pushState(state, '', window.location.href);
    }, [state]);
};

