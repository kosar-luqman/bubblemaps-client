import { useEffect, useState } from "react"
import { GetServerSideProps } from "next"
import Link from "next/link"
import axios from "axios"
import Bubbles from "@/components/Bubbles"
import { toast } from "react-toastify"
import { MdArrowBackIos, MdContentCopy } from "react-icons/md"

const NEXT_PUBLIC_API_URL = process.env.NEXT_PUBLIC_API_URL

type TokenItem = ({ address }: { address: string }) => void

const Token: TokenItem = ({ address }) => {
  const [tokenData, setTokenData] = useState<TokenData>()
  const [selectedTrader, setSelectedTrader] = useState({
    wallet: "",
    rank: -1,
    realized_profit_usd: -1,
    avg_buy_price_usd: -1,
    avg_sell_price_usd: -1,
    realized_profit_percentage: -1,
    count_of_trades: -1,
  })

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  console.log(address, "address")

  useEffect(() => {
    if (!address) {
      setError(true)
      setLoading(true)
      return
    }

    axios
      .get(`${NEXT_PUBLIC_API_URL}/ethereum/tokens/${address}`)
      .then(({ data }) => {
        setTokenData(data)
        setLoading(false)
        setError(false)
      })
      .catch((err) => {
        setLoading(false)
        setError(true)
      })
  }, [address])

  console.log(loading, "loading")

  const tokenInfo = tokenData?.tokenInfo
  const topTraders = tokenData?.topTraders
  const links = tokenData?.links
  const supplyData = tokenData?.supplyData

  const handleSelectTrader = (wallet: string) => {
    const selected = topTraders?.find((trader) => trader.address === wallet)

    if (selected) {
      setSelectedTrader({
        wallet: selected.address,
        rank: selected.rank,
        realized_profit_usd: selected?.realized_profit_usd,
        avg_buy_price_usd: Number(selected?.avg_buy_price_usd),
        avg_sell_price_usd: Number(selected?.avg_sell_price_usd),
        realized_profit_percentage: Number(
          selected?.realized_profit_percentage
        ),
        count_of_trades: selected?.count_of_trades,
      })
    }
  }

  const copyText = () => {
    navigator.clipboard.writeText(selectedTrader.wallet)
    toast.success("Copied to clipboard")
  }

  console.log(loading)

  if (error) {
    return (
      <div className=" text-black bg-[#d7d7d7] h-screen flex flex-col items-center justify-center">
        <div className="wrapper flex flex-col items-center justify-center gap-4">
          <h3 className="text-2xl">Ops, something went wrong</h3>
          <Link
            href="/"
            className="flex items-center bg-[#11081d] text-white w-fit p-2s px-5"
          >
            <p>Back</p>
          </Link>
        </div>
      </div>
    )
  }

  if (!loading) {
    return (
      <div
        className={`fixed left-0 top-0 flex items-center justify-center w-full h-screen z-[99] bg-[#11081d] `}
      >
        <div className="flex-col gap-4 w-full flex items-center justify-center">
          <div className="w-28 h-28 border-8 text-blue-400 overflow-hidden text-4xl animate-spin duration-1000 border-gray-300 flex items-center justify-center border-t-blue-400 rounded-full">
            <img
              src="/ethereum.wine.svg"
              className="object-cover w-full h-full"
            />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col overflow-hidden bg-[#11081d]">
      <div className=" text-black bg-[#d7d7d7] flex flex-col ">
        <div className="wrapper">
          <Link href="/" className="flex items-center gap-1 w-fit group">
            <MdArrowBackIos className="transition-all transform translate-x-1.5 group-hover:translate-0" />
            <p>Back</p>
          </Link>
        </div>

        {supplyData && (
          <div className="wrapper flex justify-between">
            <div className="space-y-1">
              <h3 className="text-xl font-[600] mb-3">Token Info</h3>

              <p>
                <span className="font-[500]">Token Name:</span>{" "}
                <span className="font-[300]">{tokenInfo?.name}</span>
              </p>

              <p>
                <span className="font-[500]">Token Symbol:</span>{" "}
                <span className="font-[300]">{tokenInfo?.symbol}</span>
              </p>

              <p>
                <span className="font-[500]">Token Address:</span>{" "}
                <span className="font-[300]">{tokenInfo?.address}</span>
              </p>

              <p>
                <span className="font-[500]">Token Decimals:</span>{" "}
                <span className="font-[300]">{tokenInfo?.decimals}</span>
              </p>
            </div>

            <div className="space-y-1">
              <h3 className="text-xl font-[600] mb-3">Supply Analysis</h3>

              <p>
                <span className="font-[500]">Decentralisation Score:</span>{" "}
                <span className="font-[300]">
                  {supplyData?.decentralisation_score}%
                </span>
              </p>

              <p>
                <span className="font-[500]">Identified Supply</span>{" "}
              </p>

              <p className="font-[400] text-sm ml-2">
                <span className="font-[600]">
                  {supplyData?.identified_supply.percent_in_cexs}%{" "}
                </span>
                in CEX
              </p>

              <p className="font-[400] text-sm ml-2">
                <span className="font-[600]">
                  {supplyData?.identified_supply.percent_in_contracts}%{" "}
                </span>
                in Contract
              </p>

              <p>
                <span className="font-[500]">Status: </span>
                <span className="font-[300]">{supplyData?.status}</span>
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="relative my-2">
        {selectedTrader?.wallet ? (
          <div className="absolute left-[20px] top-[10px] min-w-[20rem] p-3  bg-[#2c2831] text-[#fff] z-[9999] rounded-[1rem]">
            <h3 className="text-xl">Selected Wallet #{selectedTrader?.rank}</h3>

            <div className="mt-3 flex items-center gap-3">
              <a
                href={`https://etherscan.io/token/${tokenInfo?.address}?a=${selectedTrader?.wallet}`}
                target="_blank"
                className="underline text-[#7d49c1]"
              >
                {selectedTrader.wallet?.substring(0, 6)}
                ...
                {selectedTrader.wallet?.substring(
                  selectedTrader.wallet?.length - 4
                )}
              </a>
              <MdContentCopy onClick={copyText} className="cursor-pointer" />
            </div>

            <div className="flex flex-col gap-[10px] mt-4">
              <div className="">
                Number of Trades:{" "}
                <span className="text-[#ececec] font-[300]">
                  {selectedTrader.count_of_trades}
                </span>
              </div>

              <div>
                Average Buy Price:{" "}
                <span className="text-[#ececec] font-[300]">
                  {selectedTrader.avg_buy_price_usd.toFixed(12)} USD
                </span>
              </div>

              <div>
                Average Sell Price:{" "}
                <span className="text-[#ececec] font-[300]">
                  {selectedTrader.avg_sell_price_usd.toFixed(12)} USD
                </span>
              </div>
              <div>
                Realized Profit:{" "}
                <span className="text-[#2add2a] font-[300]">
                  {selectedTrader.realized_profit_usd.toLocaleString(
                    undefined,
                    {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    }
                  )}
                  USD
                </span>
                {" - "}
                <span className="text-[#2add2a]">
                  {selectedTrader?.realized_profit_percentage.toLocaleString(
                    undefined,
                    {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    }
                  )}
                  %
                </span>
              </div>
            </div>
          </div>
        ) : (
          <></>
        )}

        {tokenData?.topTraders && tokenData?.topTraders?.length > 0 && (
          <div className="">
            {/* <Bubbles links={links} traders={traders} /> */}
            <Bubbles
              topTraders={topTraders}
              links={links}
              handleSelectTrader={handleSelectTrader}
            />
          </div>
        )}
      </div>
    </div>
  )
}

export default Token

export const getServerSideProps: GetServerSideProps = async (context) => {
  const id = context.query.id || ""

  return {
    props: {
      address: id,
    },
  }
}
