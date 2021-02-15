import React, { useEffect, useState } from 'react';
import classNames from 'classnames';
import Spacer from '@/components/Spacer';
import Button from '@/components/Button';

import styles from './index.module.scss';
import { vscodeApi } from '@/utils/vscode';
import WebViewAction, { WebviewActionEnum } from '@src/types/WebviewAction';
import useListenMessage from '@/hooks/useListenMessage';

export type Props = {
  token?: string;
};

const PAT = ({ token }: Props) => {
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [inputToken, setInputToken] = useState('');
  const hasToken = !!token;

  useListenMessage(({ action, payload }) => {
    if (action === WebviewActionEnum.ValidatePATResult) {
      setIsValidating(false);
      if (payload.success) {
        setIsEditing(false);
      } else {
        setError(`Token validation failed${payload.message ? `: ${payload.message}` : '.'}`);
      }
    }
  });

  const edit = () => {
    setInputToken(token ?? '');
    setIsValidating(false);
    setError('');
    setIsEditing(true);
  };

  const validate = () => {
    const action: WebViewAction = {
      action: WebviewActionEnum.ValidatePAT,
      payload: inputToken,
    };

    setError('');
    setIsValidating(true);
    vscodeApi.postMessage(action);
  };

  const getDescription = () => {
    if (isEditing) {
      if (isValidating) {
        return 'Validating...';
      }

      if (error) {
        return error;
      }
    }

    if (hasToken) {
      return 'Enjoy your 5,000 per hour rate limit.';
    }

    return 'For unauthenticated requests, the rate limit is 60 per hour. It will increase to 5,000 per hour with your PAT.';
  };

  return (
    <div>
      <h4>GitHub Personal Access Token</h4>
      <div className={classNames(styles.patControl, hasToken && styles.enabled)}>
        {!isEditing && (
          <>
            <div className={styles.dot}></div>
            <div>{hasToken ? `Enabled (***${token?.slice(-4)})` : 'Not in Use'}</div>
            <Spacer />
            <Button onClick={edit}>{hasToken ? 'Update' : 'Setup'}</Button>
            {hasToken && (
              <Button onClick={() => {}} type="secondary">
                Remove
              </Button>
            )}
          </>
        )}
        {isEditing && (
          <>
            <input
              disabled={isValidating}
              type="text"
              value={inputToken}
              onChange={({ target: { value } }) => setInputToken(value)}
              autoFocus
            />
            <Button disabled={isValidating} onClick={validate}>
              OK
            </Button>
            <Button type="secondary" disabled={isValidating} onClick={() => setIsEditing(false)}>
              Cancel
            </Button>
          </>
        )}
      </div>
      <div className={styles.description}>{getDescription()}</div>
    </div>
  );
};

export default PAT;
