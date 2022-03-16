/* eslint-disable max-classes-per-file */
/* eslint-disable lines-between-class-members */
/* eslint-disable object-shorthand */
import { observable, action, makeObservable, makeAutoObservable } from "mobx";
import moment from "moment";
import { Contract } from "near-api-js";
import { NotificationType } from "../constants/NotificationType";

export class NotificationObj {
  type = NotificationType.INFO;
  message = "";
  show = false;
  constructor() {
    makeAutoObservable(this);
  }
}

export class TokenState {
  contract = null;
  constructor() {
    makeAutoObservable(this);
  }
}

export class TokenContract {
  totalDeposit = null;
  tokenPeriod = null;
  saleInfo = null;
  tokenInfo = null;
  constructor() {
    makeObservable(this, {
      totalDeposit: observable,
      tokenPeriod: observable,
      saleInfo: observable,
      tokenInfo: observable,
    });
  }
}
export class TokenSalesStore {
  tokenState = new TokenState();
  userContract = null;
  tokenContract = new TokenContract();
  deposit = 0;
  withdraw = 0;
  redeem = 0;
  DEFAULT_GAS = 300000000000000;
  DEFAULT_STORAGE_DEPOSIT = 0.00125;
  notification = new NotificationObj();
  loading = false;
  tokenStore = null;
  ACCOUNT_ID = null;

  constructor() {
    // makeAutoObservable(this);
    makeObservable(this, {
      tokenState: observable,
      userContract: observable,
      tokenContract: observable,
      // nearUtils: observable,
      deposit: observable,
      withdraw: observable,
      redeem: observable,
      notification: observable,
      loading: observable,

      initContract: action,
      initTokenContract: action,
      fetchUserData: action,
      removeUseData: action,
      fetchContractStatus: action,
      setTokenStore: action,
      // logout: action,
      submitDeposit: action,
      submitWithdrawal: action,
      submitRedeem: action,
      getCountdownStart: action,
      getCountdownGrace: action,
      getCountdownRedeem: action,

      // period: computed,
      getStartTime: action,
      getSalesEndTime: action,
      getRedeemEndTime: action,
      setAccountId: action,
      // countDownDeposit: computed,
      // countDownWithdraw: computed,
      // countDownRedeem: computed
    });
  }
  setTokenStore = (tokenStore) => {
    this.tokenStore = tokenStore;
  };
  setAccountId = (accountId) => {
    this.ACCOUNT_ID = accountId;
  };

  initContract = async (saleContract) => {
    // Initialize connection to the NEAR testnet
    console.log(this.tokenStore.nearConfig.contractName);
    try {
      const contract = await new Contract(
        this.tokenStore.walletConnection.account(),
        // "dev-1636808664410-33820590914842",
        saleContract,
        {
          viewMethods: ["get_total_deposit", "get_sale_info", "check_sale_status", "get_user_sale"],
          // Change methods can modify the state. But you don't receive the returned value when called.
          changeMethods: ["deposit", "withdraw", "finish", "redeem"],
        }
      );

      this.tokenState = {
        contract,
      };
      this.tokenContract = { ...this.tokenContract, ...contract };

      // if (contract) {
      //   await this.fetchContractStatus(contract);
      // }
      if (this.tokenStore.walletConnection.isSignedIn()) {
        await this.fetchUserData(contract);
      }
    } catch (error) {
      console.log(error);
    }
  };

  initTokenContract = async (ftContractName) => {
    try {
      const tokenContract = await new Contract(
        this.tokenStore.walletConnection.account(),
        ftContractName,
        {
          // View methods are read only. They don't modify the state, but usually return some value.
          viewMethods: ["ft_metadata", "ft_balance_of", "storage_balance_of"],
          // Change methods can modify the state. But you don't receive the returned value when called.
          changeMethods: ["ft_transfer", "storage_deposit"],
        }
      );
      return tokenContract;
    } catch (error) {
      console.log(error);
    }
    return null;
  };

  fetchUserData = async (contract) => {
    this.setNotification("Waiting for transaction...");
    try {
      this.userContract = await contract.get_user_sale({ account_id: this.tokenStore.accountId });
      console.log("Fetch User Data :", this.userContract);
    } catch (error) {
      this.setNotification(error.message, NotificationType.ERROR);
      console.error("Fetch User Data :", error);
    }
  };

  removeUseData = () => {
    this.userContract = null;
  };

  fetchContractStatus = async (accountId = null) => {
    try {
      const result = await Promise.all([
        this.tokenStore.callViewMethod(accountId || this.ACCOUNT_ID, "get_sale_info"),
        this.tokenStore.callViewMethod(accountId || this.ACCOUNT_ID, "get_total_deposit"),
        this.tokenStore.callViewMethod(accountId || this.ACCOUNT_ID, "check_sale_status"),
      ]);
      const saleInfo = result[0];
      const totalDeposit = result[1];
      const tokenPeriod = result[2];
      let tokenContract = await this.initTokenContract(saleInfo.ft_contract_name);

      const tokenInfo = await this.tokenStore.callViewMethod(
        saleInfo.ft_contract_name,
        "ft_metadata"
      );
      tokenContract = {
        ...tokenContract,
        ...{
          totalDeposit: totalDeposit,
          tokenPeriod: tokenPeriod,
          saleInfo: saleInfo,
          tokenInfo: tokenInfo,
        },
      };
      this.tokenContract = tokenContract;
      return tokenContract;
    } catch (error) {
      console.log(error);
    }
    return null;
  };

  submitDeposit = async () => {
    const { contract } = this.tokenState;
    try {
      this.setNotification("Waiting for transaction deposit...");
      const nearAmount = this.tokenStore.nearUtils.format.parseNearAmount(this.deposit.toString());
      // console.log(nearAmount);
      const res = await contract.deposit({}, this.DEFAULT_GAS, nearAmount);
      // this.userContract.deposit += this.deposit;
      console.log(res);
    } catch (error) {
      this.setNotification(error.message, NotificationType.ERROR, false);
    } finally {
      this.fetchUserData(this.tokenState.contract);
    }
  };

  submitWithdrawal = async () => {
    const { contract } = this.tokenState;
    try {
      this.notification = {
        type: NotificationType.INFO,
        message: "Waiting for transaction withdrawal...",
        show: true,
      };
      const nearAmount = this.tokenStore.nearUtils.format.parseNearAmount(this.withdraw.toString());
      console.log(nearAmount);
      const res = await contract.withdraw({ amount: nearAmount }, this.DEFAULT_GAS, "1");
      if (res) {
        this.notification = {
          ...this.notification,
          ...{
            type: NotificationType.SUCCESS,
            message: "Withdrawal SUCCESS",
            show: true,
          },
        };
      } else {
        this.notification = {
          ...this.notification,
          ...{
            type: NotificationType.ERROR,
            message: "Withdrawal FAIL",
            show: true,
          },
        };
      }
    } catch (error) {
      console.log(error);
      this.setNotification(error.message, NotificationType.ERROR);
    } finally {
      this.fetchUserData(this.tokenState.contract);
    }
  };

  submitRedeem = async () => {
    try {
      const { contract } = this.tokenState;
      let storageDeposit = await this.tokenContract.storage_balance_of({
        account_id: this.tokenStore.accountId,
      });
      if (storageDeposit === null) {
        storageDeposit = await this.tokenContract.storage_deposit(
          {},
          this.DEFAULT_GAS,
          this.tokenStore.nearUtils.format.parseNearAmount(this.DEFAULT_STORAGE_DEPOSIT.toString())
        );
        console.log(storageDeposit);
      }
      this.notification = {
        type: NotificationType.INFO,
        message: "Waiting for transaction redeem...",
        show: true,
      };

      const res = await contract.redeem({}, this.DEFAULT_GAS, "1");
      if (res) {
        this.notification = {
          type: NotificationType.SUCCESS,
          message: "Redeem SUCCESS",
          show: true,
        };
      } else {
        this.notification = {
          type: NotificationType.ERROR,
          message: "Redeem FAIL",
          show: true,
        };
      }
    } catch (error) {
      console.log(error);
      this.notification = {
        type: NotificationType.ERROR,
        message: error.message,
        show: true,
      };
    } finally {
      this.fetchUserData(this.tokenState.contract);
    }
  };

  getCountdownStart = (tokenContract) => {
    if (tokenContract?.saleInfo) {
      const startTime = tokenContract?.saleInfo?.start_time / 1000000;
      return (startTime - new Date().getTime()) / 1000;
    }
    return -1;
  };

  getCountdownGrace = (tokenContract) => {
    if (tokenContract?.saleInfo) {
      const startTime = tokenContract.saleInfo.start_time / 1000000;
      const saleDuration = tokenContract.saleInfo.sale_duration / 1000000;
      return (startTime + saleDuration - new Date().getTime()) / 1000;
    }
    return -1;
  };

  getCountdownRedeem = (tokenContract) => {
    if (tokenContract?.saleInfo) {
      const startTime = tokenContract.saleInfo.start_time / 1000000;
      const saleDuration = tokenContract.saleInfo.sale_duration / 1000000;
      const graceDuration = tokenContract.saleInfo.grace_duration / 1000000;
      return (startTime + saleDuration + graceDuration - new Date().getTime()) / 1000;
    }
    return -1;
  };

  setNotification = (message, type = NotificationType.INFO, autoHide = true) => {
    this.notification = {
      type: type,
      message: message,
      show: true,
    };
    if (autoHide) {
      setTimeout(() => {
        this.notification.show = false;
      }, 5000);
    }
  };

  getStartTime = () => {
    if (this.tokenContract?.saleInfo) {
      const startTime = this.tokenContract?.saleInfo?.start_time / 1000000;
      return moment(startTime).format("YYYY-MM-DD HH:mm:ss");
    }
    return -1;
  };

  getSalesEndTime = () => {
    if (this.tokenContract?.saleInfo) {
      const startTime = this.tokenContract?.saleInfo?.start_time / 1000000;
      const saleDuration = this.tokenContract.saleInfo.sale_duration / 1000000;
      return moment(startTime + saleDuration).format("YYYY-MM-DD HH:mm:ss");
    }
    return -1;
  };

  getRedeemEndTime = () => {
    if (this.tokenContract?.saleInfo) {
      const startTime = this.tokenContract?.saleInfo?.start_time / 1000000;
      const saleDuration = this.tokenContract.saleInfo.sale_duration / 1000000;
      const graceDuration = this.tokenContract.saleInfo.grace_duration / 1000000;
      return moment(startTime + saleDuration + graceDuration).format("YYYY-MM-DD HH:mm:ss");
    }
    return -1;
  };
}
