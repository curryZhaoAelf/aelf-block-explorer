/*
 * @Author: aelf-lxy
 * @Date: 2023-07-31 14:37:10
 * @LastEditors: Peterbjx
 * @LastEditTime: 2023-08-16 15:57:46
 * @Description: root layout
 */

import '@_style/globals.css';
import type { Metadata } from 'next';
import RootProvider from './pageProvider';
import Header from '@_components/Header';
import Footer from '@_components/Footer';
import MainContainer from '@_components/Main';
import { headers } from 'next/headers';
import StyledComponentsRegistry from '@_lib/AntdRegistry';
import { isMobileOnServer } from '@_utils/isMobile';
import { Suspense } from 'react';
import { IExplorerItem, INetworkItem } from '@_types';
import request from '@_api';

export const metadata: Metadata = {
  title: 'Create Next App',
  description: 'Generated by create next app',
  // nextjs default meta makes fixed fail
  viewport: 'width=device-width, initial-scale=1,maximum-scale=1, user-scalable=no',
};
async function fetchData() {
  await new Promise((resolve) => setTimeout(resolve, 1000));
  const res = {
    price: { USD: 1 },
    previousPrice: { usd: 2 },
  };
  // const res = await request.common.getPrice({ cache: 'no-store' } as Request);
  return res;
}
async function fetchExplorerList() {
  const result = await request.cms.explorerList();
  return result?.data;
}
async function fetchNetworkList() {
  const result = await request.cms.networkList();
  return result?.data;
}
async function fetchMenuList() {
  const result = await request.cms.menuList();
  return result?.data;
}
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const data = await fetchData();
  const { price, previousPrice } = data;
  const headersList = headers();
  const isMobile = isMobileOnServer(headersList);
  const explorerList: IExplorerItem[] = await fetchExplorerList();
  const networkList: INetworkItem[] = await fetchNetworkList();
  const menuList = await fetchMenuList();
  return (
    <html lang="en">
      <body>
        <div className="box-border relative min-h-screen bg-global-grey">
          <StyledComponentsRegistry>
            <Suspense>
              <Header
                priceSSR={price}
                previousPriceSSR={previousPrice}
                isMobileSSR={isMobile}
                explorerList={explorerList}
                networkList={networkList}
                menuList={menuList}
              />
            </Suspense>
            <RootProvider isMobileSSR={isMobile}>
              <Suspense>
                <MainContainer isMobileSSR={isMobile}>{children}</MainContainer>
              </Suspense>
            </RootProvider>
            <Suspense>
              <Footer isMobileSSR={isMobile} />
            </Suspense>
          </StyledComponentsRegistry>
        </div>
      </body>
    </html>
  );
}
