import React, { useState, useEffect, useContext } from 'react';
import {render, act, screen, waitFor, fireEvent} from '@testing-library/react'
import * as fetchUtil from 'api/fetchUtil';

import { AppContext, AppContextProvider } from 'context/AppContext';
import { AccountContextProvider } from 'context/AccountContext';
import { ProfileContextProvider } from 'context/ProfileContext';
import { CardContextProvider } from 'context/CardContext';
import { ChannelContextProvider } from 'context/ChannelContext';
import { StoreContextProvider } from 'context/StoreContext';
import { UploadContextProvider } from 'context/UploadContext';
import { ViewportContextProvider } from 'context/ViewportContext';
import { ConversationContextProvider } from 'context/ConversationContext';

function MockWebsocket(url) {
  setTimeout(() => {
    this.onmessage({ data: JSON.stringify({ account: 1, profile: 1, card: 1, channel: 1 }) });
  });
};

let appContext = null;
function AppView() {
  const [renderCount, setRenderCount] = useState(0);
  const app = useContext(AppContext);
  appContext = app;

  useEffect(() => {
    setRenderCount(renderCount + 1);
  }, [app.state]);

  return (
    <div>
      <span data-testid="count">{ renderCount }</span>
      <span data-testid="disconnected">{ app.state.disconnected ? 'true' : 'false' }</span>
    </div>
  );
}

function AppTestApp() {
  return (
    <UploadContextProvider>
      <ChannelContextProvider>
        <CardContextProvider>
          <ProfileContextProvider>
            <StoreContextProvider>
              <AccountContextProvider>
                <ViewportContextProvider>
                  <AppContextProvider>
                    <AppView />
                  </AppContextProvider>
                </ViewportContextProvider>
              </AccountContextProvider>
            </StoreContextProvider>
          </ProfileContextProvider>
        </CardContextProvider>
      </ChannelContextProvider>
    </UploadContextProvider>
  );
}

const realCreateWebsocket = fetchUtil.createWebsocket;
const realFetchWithTimeout = fetchUtil.fetchWithTimeout;
const realFetchWithCustomTimeout = fetchUtil.fetchWithCustomTimeout;
beforeEach(() => {

  const mockCreateWebsocket = jest.fn().mockImplementation((url) => {
    return new MockWebsocket(url);
  });

  const mockFetch = jest.fn().mockImplementation((url, options) => {

    console.log(url, options);
    const params = url.split('/');
    if (params[1] === 'account' && options.method === 'POST') {
      return Promise.resolve({
        json: () => Promise.resolve({ guid: '01ab', appToken: 'aacc', created: 2, pushSupported: false })
      });
    }
    else {
      return Promise.resolve({
        json: () => Promise.resolve([])
      });
    }
  });
  fetchUtil.createWebsocket = mockCreateWebsocket;
  fetchUtil.fetchWithTimeout = mockFetch;
  fetchUtil.fetchWithCustomTimeout = mockFetch;
});

afterEach(() => {
  fetchUtil.createWebsocket = realCreateWebsocket;
  fetchUtil.fetchWithTimeout = realFetchWithTimeout;
  fetchUtil.fetchWithCustomTimeout = realFetchWithCustomTimeout;
});

test('testing app sync', async () => {
  render(<AppTestApp />);

  await waitFor(async () => {
    expect(appContext).not.toBe(null);
  });

  await act(async () => {
    appContext.actions.login('testlogin', 'testpassword');
  });

  await waitFor(async () => {
    expect(screen.getByTestId('disconnected').textContent).toBe('false');
  });

});


