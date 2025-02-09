import React from "react";
import type { PageContextBuiltInClientWithClientRouting } from 'vike/types';

export type TPageContext = PageContextBuiltInClientWithClientRouting & {
    _baseServer: string
    pageProps?: any
}

export const PageContext = React.createContext<TPageContext | null>(null);

export const usePageContext = () => React.useContext(PageContext);