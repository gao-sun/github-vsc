import React, { useEffect, useState } from 'react';
import { useDebouncedCallback } from 'use-debounce';

import Button from '@/components/Button';
import Description from '@/components/Description';
import Title from '@/components/Title';
import { vscodeApi } from '@core/utils/vscode';
import { GitHubRef, SessionData } from '@core/types/foundation';
import { RemoteSessionDataPayload, WebviewActionEnum } from '@src/core/types/webview-action';

import styles from './index.module.scss';
import RadioGroup from '@/components/RadioGroup';
import Tip from '@/components/Tip';
import useListenMessage from '@src/core/hooks/useListenMessage';
import { RunnerStatus } from '@src/extension/remote-session/types';
import { conditional } from '@src/extension/utils/object';
import { RunnerClientOS, RunnerClientStatus } from '@github-vsc-runner/core';
import classNames from 'classnames';
import { defaultShell } from '@src/core/consts/session';
import { Props, SessionMethod, sessionOptions } from './foundation';
import { getRefKey } from '@src/core/utils/git-ref';
import { availableRunners, RunnerStatusData } from '@src/core/types/session';
import logger from '@src/core/utils/logger';

// TO-DO: refactor
const RemoteSession = ({ repoData, sessionData, userContext }: Props) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [workflowRef, setWorkflowRef] = useState<GitHubRef>();
  const [sessionId, setSessionId] = useState('');
  const [shell, setShell] = useState('');
  const [portForwarding, setPortForwarding] = useState('8080');
  const [portForwardingEnabled, setPortForwardingEnabled] = useState(false);
  const [serverAddress, setServerAddress] = useState(availableRunners[0].address);
  const [newSessionOS, setNewSessionOS] = useState(RunnerClientOS.Ubuntu_20_04);
  const [sessionMethod, setSessionMethod] = useState(SessionMethod.StartNew);
  const [runnerStatusData, setRunnerStatusData] = useState<RunnerStatusData>({
    runnerStatus: RunnerStatus.Initial,
    runnerClientStatus: RunnerClientStatus.Offline,
  });
  const { runnerStatus, runnerClientStatus, runnerClientOS } = runnerStatusData;
  const emitPortForwarding = useDebouncedCallback(() => {
    const payload = conditional(portForwardingEnabled && Number(portForwarding));
    logger.debug('post port forwarding', payload);
    vscodeApi.postMessage({
      action: WebviewActionEnum.SetPortForwarding,
      payload,
    });
  }, 300);

  useEffect(() => {
    if (sessionData?.defaultShell || runnerClientOS) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      setShell(sessionData?.defaultShell ?? defaultShell[runnerClientOS!] ?? '');
    }
  }, [runnerClientOS, sessionData?.defaultShell]);

  useEffect(() => {
    vscodeApi.postMessage({
      action: WebviewActionEnum.RequestRemoteSessionData,
    });
    vscodeApi.postMessage({
      action: WebviewActionEnum.RequestPortForwardingData,
    });
  }, []);

  useEffect(() => {
    if (sessionData?.sessionId) {
      setServerAddress(sessionData.serverAddress);
      setSessionId(sessionData.sessionId);
      setSessionMethod(SessionMethod.Resume);
    } else {
      setSessionId('');
      setSessionMethod(SessionMethod.StartNew);
    }
  }, [sessionData]);

  useListenMessage(({ action, payload }) => {
    if (action === WebviewActionEnum.RemoteSessionData) {
      const {
        type,
        message,
        workflowRef,
        ...runnerStatusData
      } = payload as RemoteSessionDataPayload;

      setRunnerStatusData(runnerStatusData);

      if (type === 'message') {
        setError('');
        setMessage(message ?? '');
        setWorkflowRef(workflowRef);
      }
      if (type === 'error') {
        setError(message ?? 'Error occurred.');
        setMessage('');
        setLoading(false);
      }
      if (
        ![RunnerStatus.Connected, RunnerStatus.Connecting].includes(runnerStatusData.runnerStatus)
      ) {
        setLoading(false);
      }
    }

    if (action === WebviewActionEnum.SetPortForwarding) {
      const port = Number(payload);
      setPortForwardingEnabled(!!port);
      if (port) {
        setPortForwarding(payload);
      }
    }
  });

  const connectSession = () => {
    const payload: SessionData = {
      githubRef: repoData?.ref,
      sessionId: conditional(sessionMethod === SessionMethod.Resume && sessionId),
      serverAddress,
      os: conditional(sessionMethod === SessionMethod.StartNew && newSessionOS),
    };

    if (sessionMethod === SessionMethod.Resume && !sessionId) {
      setError('Session ID is required.');
      return;
    }

    logger.debug('trying to connect with payload', payload);
    vscodeApi.postMessage({ action: WebviewActionEnum.ConnectToRemoteSession, payload });
    setLoading(true);
  };

  const disconnectSession = () =>
    vscodeApi.postMessage({ action: WebviewActionEnum.DisconnectRemoteRession });
  const terminateSession = () =>
    vscodeApi.postMessage({ action: WebviewActionEnum.TerminateRemoteRession });
  const newTerminal = () => {
    vscodeApi.postMessage({ action: WebviewActionEnum.ActivateTerminal, payload: { shell } });
  };
  const patNote =
    'Note repo access is required for your PAT to fork runner repo and dispatch GitHub Actions workflow.';
  const shouldShowWorkflowRef =
    workflowRef &&
    runnerStatus === RunnerStatus.SessionStarted &&
    runnerClientStatus === RunnerClientStatus.Offline;
  const isPortForwardingValid = portForwardingEnabled && !!Number(portForwarding);
  const portForwardingLink = `https://${sessionId}.${new URL(serverAddress).host}`;

  if (!userContext) {
    return (
      <div className={styles.remoteSession}>
        <Title>Remote Session</Title>
        <Description>
          Setup PAT to start a remote session.
          <br />
          <br />
          {patNote}
        </Description>
      </div>
    );
  }

  if (!repoData?.ref) {
    return (
      <div className={styles.remoteSession}>
        <Title>Remote Session</Title>
        <Description>Connect to a GitHub repo to start remote session.</Description>
      </div>
    );
  }

  return (
    <div className={styles.remoteSession}>
      <Title>Remote Session</Title>
      {runnerStatus !== RunnerStatus.SessionStarted && (
        <>
          <Description>
            Start a remote session to enable terminal access on {getRefKey(repoData.ref)}.<br />
            <br />
            {patNote}
            <br />
          </Description>
          <RadioGroup
            options={sessionOptions}
            onChange={setSessionMethod}
            name="session-method"
            value={sessionMethod}
            disabled={loading}
          />
          <Title level={3}>Runner Server</Title>
          <select
            name="runner-server"
            disabled={loading}
            value={serverAddress}
            onChange={({ target: { value } }) => setServerAddress(value)}
          >
            {availableRunners.map(({ name, address }) => (
              <option key={name} value={address}>
                {name}
              </option>
            ))}
          </select>
          {sessionMethod === SessionMethod.StartNew && (
            <>
              <Title level={3}>Runner Client OS</Title>
              <select
                disabled={loading}
                name="runner-client-os"
                value={newSessionOS}
                onChange={({ target: { value } }) => {
                  setNewSessionOS(value as RunnerClientOS);
                }}
              >
                {Object.entries(RunnerClientOS)
                  .filter(([, os]) => !os.startsWith('windows'))
                  .map(([key, os]) => (
                    <option key={key} value={os}>
                      {os}
                    </option>
                  ))}
              </select>
            </>
          )}
          {sessionMethod === SessionMethod.Resume && (
            <>
              <Title level={3}>Session ID</Title>
              <input
                disabled={loading}
                type="text"
                value={sessionId}
                onChange={({ target: { value } }) => setSessionId(value)}
              />
            </>
          )}
          <div className={styles.action}>
            <Button disabled={loading} onClick={connectSession}>
              {sessionMethod} Session
            </Button>
          </div>
        </>
      )}
      {runnerStatus === RunnerStatus.SessionStarted && (
        <>
          <div className={styles.row}>
            <Title level={3} noMargin>
              Runner Server
            </Title>
            <Description noMargin>{serverAddress}</Description>
          </div>
          <div className={styles.row}>
            <Title level={3} noMargin>
              Runner Client
            </Title>
            <Description noMargin>{runnerClientStatus}</Description>
          </div>
          {runnerClientOS && (
            <div className={styles.row}>
              <Title level={3} noMargin>
                OS
              </Title>
              <Description noMargin>{runnerClientOS}</Description>
            </div>
          )}
          {sessionId && (
            <div className={styles.row}>
              <Title level={3} noMargin>
                Session ID
              </Title>
              <Description noMargin>{sessionId}</Description>
            </div>
          )}
          <div className={classNames(styles.action, styles.unplug)}>
            <Button type="secondary" disabled={loading} onClick={terminateSession}>
              Terminate
            </Button>
            <Button type="secondary" disabled={loading} onClick={disconnectSession}>
              Disconnect
            </Button>
          </div>
          {runnerClientStatus === RunnerClientStatus.Online && (
            <>
              <Title level={3}>Port Forwarding</Title>
              <div className={classNames(styles.row, styles.portForwarding)}>
                <input
                  type="text"
                  placeholder="Port number"
                  disabled={!portForwardingEnabled}
                  value={portForwarding}
                  onChange={({ target: { value } }) => {
                    setPortForwarding(value);
                    emitPortForwarding.callback();
                  }}
                />
                <input
                  type="checkbox"
                  name="session-port-forwarding"
                  id="session-port-forwarding"
                  checked={portForwardingEnabled}
                  onChange={({ target: { checked } }) => {
                    setPortForwardingEnabled(checked);
                    emitPortForwarding.callback();
                  }}
                />
                <label htmlFor="session-port-forwarding">Enable</label>
              </div>
              {!isPortForwardingValid && (
                <Description>
                  Enable to forward http requests from public internet to the runner client port.
                </Description>
              )}
              {isPortForwardingValid && (
                <Description>
                  Public http requests to <a href={portForwardingLink}>this link</a> will now
                  forward to port {portForwarding} in your runner client.
                </Description>
              )}
              <Title level={3}>Terminal</Title>
              <div className={classNames(styles.row, styles.terminal)}>
                <input
                  type="text"
                  placeholder="Shell file"
                  value={shell}
                  onChange={({ target: { value } }) => setShell(value)}
                ></input>
                <Button disabled={loading} onClick={newTerminal}>
                  New Terminal
                </Button>
              </div>
            </>
          )}
        </>
      )}
      {error && <Tip type="warning">{error}</Tip>}
      {(loading || message) && !error && (
        <Tip>
          {message || 'Connecting...'}
          {shouldShowWorkflowRef && (
            <>
              <br />
              <a
                href={`https://github.com/${workflowRef?.owner}/${workflowRef?.repo}/actions/workflows/runner-client.yml`}
              >
                Click here
              </a>
              &nbsp; to check your workflow status.
            </>
          )}
        </Tip>
      )}
    </div>
  );
};

export default RemoteSession;
