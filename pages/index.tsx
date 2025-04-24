import { useEffect, useState } from "react"
import { CiSearch } from "react-icons/ci"
import axios from "axios"
import Link from "next/link"

const NEXT_PUBLIC_API_URL = process.env.NEXT_PUBLIC_API_URL

export default function Home() {
  const [query, setQuery] = useState("")
  const [result, setResult] = useState({
    address: "",
    name: "",
    symbol: "",
  })

  useEffect(() => {
    // Skip the request if the query is empty
    if (query === "") return

    // Perform a search request when the query changes
    const fetchResults = async () => {
      try {
        await axios
          .get(`${NEXT_PUBLIC_API_URL}/ethereum/search/${query}`)
          .then(({ data }) => {
            setResult(data)
          })
          .catch(() => {})
      } catch (error) {
        console.error("Error fetching search results:", error)
      }
    }

    fetchResults()
  }, [query]) // Only run the effect when 'query' changes

  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value)
  }

  return (
    <div
      style={{
        backgroundImage: `url(https://www.logo.wine/a/logo/Ethereum/Ethereum-Icon-Purple-Dark-Dark-Background-Logo.wine.svg)`,
        backgroundSize: "40rem",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        backgroundColor: "#141b2f",
      }}
      className="flex flex-col items-center min-h-screen py-10 text-[#fff]"
    >
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold">Bubblemaps</h1>
        <p className="text-lg">Explore top Ethereum token traders</p>
      </div>

      <div className="relative px-2 pt-14 flex flex-col items-center justify-center gap-10 shadow-sm  max-w-[400px] w-full rounded-lg">
        <div className="flex items-center gap-[5px] border-[1px] border-[#cfcfcf] bg-[#fff] pr-3 rounded-[10px] overflow-hidden w-full">
          <input
            className="border-none outline-none w-full p-3 text-md text-black"
            type="text"
            placeholder="Enter token address"
            value={query}
            onChange={handleQueryChange}
          />
          <CiSearch className="w-7 h-7 cursor-pointer text-[#000]" />
        </div>
      </div>

      {/* Result */}
      {result?.symbol && result?.name ? (
        <Link
          href={`/tokens/${result?.address}`}
          className="flex justify-between items-center gap-2 max-w-[500px] py-4 px-3 w-full bg-[#f2f2f2] rounded-lg mt-2"
        >
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-1">
              <p className="text-black">{result?.name}</p>
              <span className="h-[2px] w-[15px] bg-[#000]"></span>
              <p className="text-black">{result?.symbol}</p>
            </div>

            <p className="text-[#000]">{result?.address}</p>
          </div>
        </Link>
      ) : (
        ""
      )}
    </div>
  )
}
