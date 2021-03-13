import React, { useState } from 'react';
import classNames from 'classnames';
import Spacer from '@/components/Spacer';
import Button from '@/components/Button';

import styles from './index.module.scss';
import { vscodeApi } from '@core/utils/vscode';
import WebViewAction, { WebviewActionEnum } from '@src/core/types/webview-action';
import useListenMessage from '@core/hooks/useListenMessage';
import Title from '@/components/Title';
import Description from '@/components/Description';

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

  const validate = (token = '') => {
    const action: WebViewAction = {
      action: WebviewActionEnum.ValidatePAT,
      payload: token,
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
      <Title>GitHub Personal Access Token</Title>
      <div className={classNames(styles.patControl, hasToken && styles.enabled)}>
        {!isEditing && (
          <>
            <div className={styles.dot}></div>
            <div>{hasToken ? `Enabled (***${token?.slice(-4)})` : 'Not in Use'}</div>
            <Spacer />
            <Button onClick={edit}>{hasToken ? 'Update' : 'Setup'}</Button>
            {hasToken && (
              <Button onClick={() => validate()} type="secondary">
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
            <Button disabled={isValidating} onClick={() => validate(inputToken)}>
              OK
            </Button>
            <Button type="secondary" disabled={isValidating} onClick={() => setIsEditing(false)}>
              Cancel
            </Button>
          </>
        )}
      </div>
      <Description>
        {getDescription()}
        {!hasToken && (
          <>
            &nbsp;
            <a href="https://github.com/settings/tokens/new?description=GitHub%20VSC%20Token&scopes=repo">
              Create PAT
            </a>
          </>
        )}
      </Description>
    </div>
  );
};

export default PAT;
