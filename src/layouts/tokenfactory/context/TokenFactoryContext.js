/* eslint-disable import/named */
/* eslint-disable react/prop-types */
import { useSoftUIController } from "context";
import React, { createContext, useEffect } from "react";
import { LOCAL_STORAGE_REGISTERED_TOKEN } from "../constants/TokenFactory";
import { TokenFactoryStore } from "../stores/TokenFactory.store";

const TokenFactoryContext = createContext();
const tokenFactoryStore = new TokenFactoryStore();
const TokenFactoryProvider = (props) => {
  const [controller] = useSoftUIController();
  const { tokenStore } = controller;
  const { children } = props;

  tokenFactoryStore.setTokenStore(tokenStore);
  useEffect(() => {
    let registeredTokens = localStorage.getItem(LOCAL_STORAGE_REGISTERED_TOKEN);
    if (registeredTokens) {
      registeredTokens = JSON.parse(registeredTokens);
      tokenFactoryStore.setRegisteredTokens(registeredTokens);
    }
  }, []);
  return (
    <TokenFactoryContext.Provider
      value={{
        tokenFactoryStore,
      }}
    >
      {children}
    </TokenFactoryContext.Provider>
  );
};

export { TokenFactoryContext, TokenFactoryProvider };
