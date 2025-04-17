address: "0x25cd302e37a69d70a6ef645daea5a7de38c66e2a"
avg_buy_price_usd: "5.9997205336e-10"
avg_cost_of_quantity_sold: "5.9997205336e-10"
avg_sell_price_usd: "0.00000606020510628364"
count_of_trades: 123
realized_profit_percentage: 1009981.2316748606
realized_profit_usd: 7204925.70618188
total_sold_usd: "7205639.07841893124591357669503562843572732544"
total_tokens_bought: "4914192180023.021208423005901385"
total_tokens_sold: "1189009109765.546556955740286899"
total_usd_invested: "2948.37797287218245507385045885299941466272"

interface Trader {
  address: string
  avg_buy_price_usd: string
  avg_cost_of_quantity_sold: string
  avg_sell_price_usd: string
  count_of_trades: number
  realized_profit_percentage: number
  realized_profit_usd: number
  rank: number
  total_sold_usd: string
  total_tokens_bought: string
  total_tokens_sold: string
  total_usd_invested: string
}

interface Link {
  source: number
  target: number
  weight: number
  totalValue: number
  firstTx: string
  lastTx: string
}

interface TokenData {
  tokenInfo: {
    address: string
    name: string
    symbol: string
    decimals: number
  }
  supplyData: {
    decentralisation_score: number
    dt_update: string
    identified_supply: {
      percent_in_cexs: number
      percent_in_contracts: number
    }
    status: string
    ts_update: number
  }
  topTraders: Trader[]
  links: Link[]
  periodAnalyzed: {
    from: string
    to: string
  }
}
