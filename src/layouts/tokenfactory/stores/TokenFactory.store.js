// eslint-disable-next-line import/prefer-default-export
// eslint-disable-next-line max-classes-per-file
import Shop from "examples/Icons/Shop";
// import { getTokenFactoryConfig } from "layouts/tokensales/config";
import { action, computed, makeObservable, observable } from "mobx";
import moment from "moment";
import { Contract, providers } from "near-api-js";
// import { LOCAL_STORAGE_CURRENT_TOKEN } from "../constants/TokenFactory";

export const TOKEN_FACTORY_STEP = {
  REGISTER: "register",
  CREATE_FT_CONTRACT: "create_ft_contract",
  CREATE_DEPLOYER_CONTRACT: "create_deployer_contract",
  ISSUE_FT: "issue_ft",
  INIT_TOKEN_ALLOCATION: "init_token_allocation",
};

export class Token {
  // tokenFactoryConfig = getTokenFactoryConfig(process.env.NODE_ENV || "development");
  icon = null;

  tokenName = "";

  symbol = "";

  initialSupply = 100000000;

  decimal = 8;

  initialRelease = 15;

  treasury = 8;

  vestingStartTime = new Date();

  vestingEndTime = moment().add(30, "day");

  vestingInterval = 1;

  vestingDuration = 4;

  constructor() {
    makeObservable(this, {
      icon: observable,
      tokenName: observable,
      symbol: observable,
      initialSupply: observable,
      decimal: observable,
      initialRelease: observable,
      treasury: observable,
      vestingStartTime: observable,
      vestingEndTime: observable,
      vestingInterval: observable,
    });
  }
}

export class TokenFactoryStore {
  steps = [
    {
      name: "Register",
      key: TOKEN_FACTORY_STEP.REGISTER,
      icon: <Shop size="14px" />,
    },
    {
      name: "Create contract",
      key: TOKEN_FACTORY_STEP.CREATE_FT_CONTRACT,
      icon: <Shop size="14px" />,
    },
    {
      name: "Create deployer contract",
      key: TOKEN_FACTORY_STEP.CREATE_DEPLOYER_CONTRACT,
      icon: <Shop size="14px" />,
    },
    {
      name: "Issue",
      key: TOKEN_FACTORY_STEP.ISSUE_FT,
      icon: <Shop size="14px" />,
    },
    {
      name: "Init token allocation",
      key: TOKEN_FACTORY_STEP.INIT_TOKEN_ALLOCATION,
      icon: <Shop size="14px" />,
    },
  ];

  DEFAULT_GAS = 300000000000000;

  DEFAULT_STORAGE_DEPOSIT = 0.00125;

  DEFAULT_NEAR_AMOUNT = "8";

  token = new Token();

  activeStep = -1;

  tokenStore;

  registeredTokens = [];

  allTokens = [];

  tokenContract;

  contract = null;

  constructor() {
    // makeAutoObservable(this);
    makeObservable(this, {
      steps: observable,
      token: observable,
      activeStep: observable,
      registeredTokens: observable,
      contract: observable,
      // tokenContract: observable,
      allTokens: observable,

      setRegisteredTokens: action,
      setAllTokens: action,
      initContract: action,
      setToken: action,
      register: action,
      createContract: action,
      createDeployerContract: action,
      issue: action,
      initTokenAllocation: action,
      getTokenState: action,
      appendRegisteredToken: action,
      getDeployerState: action,
      claim: action,
      getTransactionStatus: action,
      checkExistenceToken: action,
      getListToken: action,
      getListAllTokenContracts: action,
      registerParams: computed,
    });
  }

  setTokenStore = (tokenStore) => {
    this.tokenStore = tokenStore;
  };

  setRegisteredTokens = (lst) => {
    lst.map( async (i) => {
      const enoughStorage = await this.enoughStorage(i);

      console.log(enoughStorage);
      console.log(i)
      const clonedI = i;
      clonedI.enoughStorage = enoughStorage
      return clonedI
      // i.enoughStorage = enoughStorage;
    })
    if (this.registeredTokens.length > 0) {
      console.log(this.registeredTokens[0].enoughStorage);
    }

    this.registeredTokens = lst;
    this.remapTokenList();
  };

  setAllTokens = (lst) => {
    this.allTokens = lst;
    // this.remapTokenList();
  };

  initContract = async () => {
    try {
      const contract = await new Contract(
        this.tokenStore.walletConnection.account(),
        this.tokenStore.nearConfig.contractName,
        {
          viewMethods: [
            "get_token_state",
            "list_my_tokens",
            "list_all_tokens",
            "list_all_token_contracts",
            "list_token_states",
          ],
          // Change methods can modify the state. But you don't receive the returned value when called.
          changeMethods: [
            "register",
            "create_ft_contract",
            "create_deployer_contract",
            "issue_ft",
            "init_token_allocation",
          ],
        }
      );
      this.contract = contract;
    } catch (error) {
      console.log(error);
    }
  };

  setToken = (obj) => {
    this.token = { ...this.token, ...obj };
  };

  register = async () => {
    this.activeStep = 0;
    // console.log(this.contract);
    // localStorage.setItem(LOCAL_STORAGE_CURRENT_TOKEN, JSON.stringify(this.token));
    const value = await this.contract.register(
      this.registerParams,
      this.DEFAULT_GAS,
      this.tokenStore.nearUtils.format.parseNearAmount(this.DEFAULT_NEAR_AMOUNT)
    );
    // console.log("register : ", value);
    return value;
  };

  createContract = async () => {
    this.activeStep = 1;
    const value = await this.contract.create_ft_contract(this.registerParams, this.DEFAULT_GAS);
    // console.log("create_ft_contract : ", value);
    const current = { ...{}, ...this.registerParams };
    current.create_ft_contract = value;
    this.appendRegisteredToken(current);
    return value;
  };

  createDeployerContract = async () => {
    this.activeStep = 2;
    const value = await this.contract.create_deployer_contract(
      this.registerParams,
      this.DEFAULT_GAS
    );
    // console.log("create_deployer_contract : ", value);
    const current = { ...{}, ...this.registerParams };
    current.create_deployer_contract = value;
    this.appendRegisteredToken(current);
    return value;
  };

  issue = async () => {
    this.activeStep = 3;
    const value = await this.contract.issue_ft(this.registerParams, this.DEFAULT_GAS);
    // console.log("issue_ft : ", value);
    const current = { ...{}, ...this.registerParams };
    current.issue_ft = value;
    this.appendRegisteredToken(current);
    return value;
  };

  initTokenAllocation = async () => {
    this.activeStep = 4;
    const value = await this.contract.init_token_allocation(this.registerParams, this.DEFAULT_GAS);
    // console.log("init_token_allocation : ", value);
    const current = { ...{}, ...this.registerParams };
    current.init_token_allocation = value;
    this.appendRegisteredToken(current);
    this.setToken(new Token());
    // this.clearLocalStorageToken();
    this.activeStep = -1;
    return value;
  };

  getTokenState = async (token) => {
    const value = await this.contract.get_token_state(token || this.registerParams);
    // console.log("get_token_state : ", value);
    return value;
  };

  appendRegisteredToken = (current) => {
    const tokenIndex = this.registeredTokens.findIndex((t) => t.symbol === current.symbol);

    if (tokenIndex > -1)
      this.registeredTokens[tokenIndex] = { ...this.registeredTokens[tokenIndex], ...current };
    else this.registeredTokens.push(current);
  };

  // clearLocalStorageToken = () => {
  //   localStorage.removeItem(LOCAL_STORAGE_CURRENT_TOKEN);
  // };

  initTokenContract = async (ftContractName, viewMethods, changeMethods) => {
    try {
      const tokenContract = await new Contract(
        this.tokenStore.walletConnection.account(),
        ftContractName,
        {
          // View methods are read only. They don't modify the state, but usually return some value.
          viewMethods,
          // Change methods can modify the state. But you don't receive the returned value when called.
          changeMethods,
        }
      );
      return tokenContract;
    } catch (error) {
      console.log(error);
    }
    return null;
  };

  enoughStorage = async (token) => {
    const tokenContract = await this.initTokenContract(
      token.ft_contract,
      ["ft_metadata", "ft_balance_of", "storage_balance_of"],
      ["ft_transfer", "storage_deposit"]
    );

    try {
      if (tokenContract) {
        const storageDeposit = await tokenContract.storage_balance_of({
          account_id: this.tokenStore.accountId,
        });
        return storageDeposit;
      }
    } catch (error) {
      console.log("EnoughStorage ", error);
      return false
    }
    return false
  }

  storageDeposit = async (token) => {
    const tokenContract = await this.initTokenContract(
      token.ft_contract,
      ["ft_metadata", "ft_balance_of", "storage_balance_of"],
      ["ft_transfer", "storage_deposit"]
    );
    try {
      if (tokenContract) {
        await tokenContract.storage_deposit(
            {},
            this.DEFAULT_GAS,
            this.tokenStore.nearUtils.format.parseNearAmount(
              this.DEFAULT_STORAGE_DEPOSIT.toString()
            )
          );      }
    } catch (error) {
      console.log("claim : ", error);
    }
  }

  claim = async (token) => {
    const deployercontract = await this.inittokencontract(token.ft_deployer, [], ["claim"]);
    try {
        const res = await deployercontract.claim({}, this.default_gas);
        return res;
    } catch (error) {
      console.log("claim : ", error);
    }
    return null;
  };

  getTransactionStatus = async (txHash) => {
    const nearProvider = new providers.JsonRpcProvider("https://archival-rpc.testnet.near.org");
    const res = await nearProvider.txStatus(txHash, this.tokenStore.accountId);
    // console.log(res);
    return res;
  };

  checkExistenceToken = async (tokenContractName) => {
    const nearProvider = new providers.JsonRpcProvider("https://rpc.testnet.near.org");
    const rawResult = await nearProvider.query({
      request_type: "call_function",
      account_id: tokenContractName,
      method_name: "getMessages",
      args_base64: "e30=",
      finality: "optimistic",
    });
    const res = JSON.parse(Buffer.from(rawResult.result).toString());
    // console.log(res);
    return res;
  };

  getListToken = async () => {
    if (this.tokenStore.accountId) {
      const value = await this.contract.list_my_tokens({ account_id: this.tokenStore.accountId });
      // console.log("getListToken :", value);
      return value;
    }
    return null;
  };

  getListAllTokenContracts = async () => {
    const value = await this.tokenStore.callViewMethod(
      this.tokenStore.nearConfig.contractName,
      "list_all_token_contracts"
    );
    let start = 0;
    const length = 50;
    const promises = [];
    let finalList = [];
    // console.log("getListAllTokenContracts :", value);
    if (value) {
      while (start < value.length) {
        // console.log(start);
        const stateLst = value.slice(start, start + length);
        promises.push(
          this.tokenStore.callViewMethod(
            this.tokenStore.nearConfig.contractName,
            "list_token_states",
            {
              token_contracts: stateLst,
            }
          )
        );
        start += length;
      }

      const data = await Promise.all(promises);
      data.forEach((element) => {
        finalList = [...finalList, ...element];
      });

      // console.log("list_token_states", finalList);
      return finalList;
    }
    return null;
  };

  getDeployerState = async (lst) => {
    const merge = [];
    if (lst) {
      try {
        const lstPromises = [];
        lst.forEach((rt) => {
          const deployerPromise = async () => {
            const deployerContract = await this.initTokenContract(
              rt.ft_deployer,
              ["check_account"],
              []
            );

            try {
              const contractInfo = await deployerContract.check_account({
                account_id: this.tokenStore.accountId,
              });

              return contractInfo;
            } catch (error) {
              console.log(error);
              return null;
            }
          };
          lstPromises.push(deployerPromise());
        });
        const result = await Promise.all(lstPromises);
        // console.log(result);

        // const unClaimed = result.filter((r) => r.claimed === "0");

        // eslint-disable-next-line no-plusplus
        for (let i = 0; i < lst.length; i++) {
          merge.push({ ...lst[i], ...result[i] });
        }
      } catch (error) {
        console.log(error);
      }
    }
    return merge;
  };

  remapTokenList = () => {
    try {
      this.registeredTokens = this.registeredTokens.map((i) => ({
        ...i,
        ...{
          tokenName: i.token_name,
          symbol: i.symbol,
          initialSupply: i.total_supply / 10 ** this.token.decimal,
          decimal: i.decimals,
          enoughStorage: i.enoughStorage,
          initialRelease: (i.initial_release / i.total_supply) * 100,
          treasury: (i.treasury_allocation / i.total_supply) * 100,
          vestingStartTime: i.vesting_start_time / 10 ** 6,
          vestingEndTime: i.vesting_end_time / 10 ** 6,
          vestingInterval: i.vesting_interval / (24 * 3600 * 10 ** 9),
          vestingDuration: Math.round(
            (moment(i.vesting_end_time / 10 ** 6) - moment(i.vesting_start_time / 10 ** 6)) /
              (10 ** 3 * 24 * 3600)
          ),
        },
      }));
    } catch (error) {
      console.log(error);
    }
  };

  get registerParams() {
    return {
      icon: this.token.icon,
      ft_contract: `${this.token.symbol}.token-factory.tokenhub.testnet`.toLowerCase(),
      deployer_contract:
        `${this.token.symbol}-deployer.token-factory.tokenhub.testnet`.toLowerCase(),
      total_supply: (this.token.initialSupply * 10 ** this.token.decimal).toString(),
      token_name: this.token.tokenName,
      symbol: this.token.symbol,
      decimals: this.token.decimal,
      initial_release: (
        this.token.initialSupply *
        10 ** this.token.decimal *
        (this.token.initialRelease / 100)
      ).toString(),
      treasury_allocation: (
        this.token.initialSupply *
        10 ** this.token.decimal *
        (this.token.treasury / 100)
      ).toString(),
      vesting_start_time: (moment(this.token.vestingStartTime).unix() * 10 ** 9).toString(),
      vesting_end_time: (
        moment(this.token.vestingStartTime).add(this.token.vestingDuration, "days").unix() *
        10 ** 9
      ).toString(),
      vesting_interval: (this.token.vestingInterval * 24 * 3600 * 10 ** 9).toString(),
    };
  }

  get analysisData() {
    if (this.allTokens?.length) {
      const creators = [...new Set(this.allTokens.map((t) => t.creator))].length;
      const symbols = [...new Set(this.allTokens.map((t) => t.symbol))].length;
      return {
        numberCreators: creators,
        numberSymbols: symbols,
        totals: this.allTokens.length,
      };
    }
    return null;
  }
}
