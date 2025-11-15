import { useState, useCallback, Dispatch, SetStateAction, useEffect } from 'react';

/**
 * useStateのラッパーで、無効化状態(isDisabled)を考慮します。
 * isDisabledがtrueの場合、状態の更新をスキップします。
 * 親コンポーネントから渡される initialState が変更されたときに state を更新します。
 *
 * @param initialState - 初期状態
 * @param isDisabled - 状態更新を無効化するかどうか
 * @returns [S, Dispatch<SetStateAction<S>>] - useStateと同様の配列
 */
export function useControlledState<S>(
  initialState: S | (() => S),
  isDisabled: boolean,
): [S, Dispatch<SetStateAction<S>>] {
  const [state, setState] = useState<S>(initialState);

  const controlledSetState = useCallback<Dispatch<SetStateAction<S>>>(
    (action) => {
      if (!isDisabled) {
        setState(action);
      }
    },
    [isDisabled],
  );
  
  // 親コンポーネントから渡される initialState が変更されたときに state を更新する
  // これにより、例えばアカウント切り替え時に表示データをリセットできる
  useEffect(() => {
    setState(initialState);
  }, [JSON.stringify(initialState)]);

  return [state, controlledSetState];
}

export default useControlledState;
