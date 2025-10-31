"use client";
import { Sign } from "crypto";
import { useSession } from "next-auth/react";
import Image from "next/image";
import SigninWithGoogle from "./SigninWithGoogle";
import Signout from "./Signout";


const ClientComponent = () => {
  const {data,status} =  useSession();
  return (
    <div> 
        {status === "loading" && <p>Loading...</p>}
        {status === "unauthenticated" && <SigninWithGoogle />}
        {status === "authenticated" &&  (
            <>
                <h1 className="text-2xl font-bold">Welcome, {data.user?.name}!</h1>
                <Image
                    className="rounded-full"
                    src={data.user?.image as string || "/default-avatar.png"}
                    alt="User Avatar"
                    width={100}
                    height={100}
                />
                <p className="text-sm text-gray-500">{data.user?.email}</p>
                <Signout/>
            </>
        )}
    </div>
  )
}

export default ClientComponent