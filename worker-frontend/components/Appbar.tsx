"use client";
// import {
//   WalletDisconnectButton,
//   WalletMultiButton,
// } from "@solana/wallet-adapter-react-ui";
// import { useWallet } from "@solana/wallet-adapter-react";
import { useEffect } from "react";
import axios from "axios";

export const Appbar = () => {
  // const { publicKey, signMessage } = useWallet();

  // async function signAndSend() {
  //   if (!publicKey) {
  //     return;
  //   }
  //   const message = new TextEncoder().encode("Sign into mechanical turks");
  //   const signature = await signMessage?.(message);
  //   console.log(signature);
  //   console.log(publicKey);
  //   const response = await axios.post(`${BACKEND_URL}/v1/user/signin`, {
  //     signature,
  //     publicKey: publicKey?.toString(),
  //   });

  //   localStorage.setItem("token", response.data.token);
  // }

  // useEffect(() => {
  //   signAndSend();
  // }, [publicKey]);

  return (
    <div className="flex justify-between text-black bg-white border-b pb-2 pt-2">
      <div className="text-2xl pl-4 flex justify-center pt-3">
        Turkify (WORKER)
      </div>
      <div className="text-xl pr-4 pb-2 bg-black text-white p-2 rounded-lg px-4 mr-4 shadow-lg">
        Connect Wallet
        {/* {publicKey ? <WalletDisconnectButton /> : <WalletMultiButton />} */}
      </div>
    </div>
  );
};
export default Appbar;