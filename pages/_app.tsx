import "@/styles/globals.css"
import type { AppProps } from "next/app"
import Head from "next/head"
import { useEffect, useState } from "react"
import { ToastContainer, toast } from "react-toastify"
import { Inter } from "next/font/google"

const inter = Inter({ subsets: ["latin"] })

export default function App({ Component, pageProps }: AppProps) {
  const [domLoaded, setDomLoaded] = useState(false)

  useEffect(() => {
    setDomLoaded(true)
  }, [])
  return (
    <>
      <Head>
        <link rel="icon" href="/Ethereum-icon-purple.svg" />

        <title>Bubblemaps</title>
      </Head>
      <main className={inter.className}>
        {domLoaded && <Component {...pageProps} />}
        <ToastContainer />
      </main>
    </>
  )
}
