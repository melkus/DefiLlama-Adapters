const { calculateUsdUniTvl } = require('../helper/getUsdUniTvl');
// const { stakingUnknownPricedLP } = require("../helper/staking");

// const sdk = require('@defillama/sdk');
// const { getBlock } = require('./getBlock');
const getReserves = require('./helper/abis/getReserves.json');
const token0Abi = require('./helper/abis/token0.json');
const token1Abi = require('./helper/abis/token1.json');
const { default: BigNumber } = require('bignumber.js');


const USDT = '0x6Cb9750a92643382e020eA9a170AbB83Df05F30B'
const WROSE = '0x21C718C22D52d0F3a789b752D4c2fD5908a8A733'
const VS = ''
const masterchef = '0xaE0aF27df228ACd8BA91AF0c917a31A9a681A097'
const vsUsdtLp = '0x222B7A422D3F04E9c1FE91D54e2f0da944907b0A'
const roseUsdtLp = '0x5f1412d91eFc8a9bd5c9408B685ADD2d596629dF'
const usdcUsdtLp = '0xc94Bc60C8079DB3deED5AFd519Ba32726C53D831'
const btcUsdtLp = '0x46d8e7EB6e87c9C7f3F80dbcf4ECC5BFE37AA2Da'
const ethUsdtLp = '0x35a7e44EBeD5c91c636e90e7795dc51E36dA558d'
const roseVstLp = '0x52DC3a8629dDe9c3001cD8e619301cB0eF6AAe62'

function staking(timestamp, block, chainBlocks) {
  return async (timestamp, _ethBlock, chainBlocks) => {
    //const rosePrise = 0
    let total = await stakingLP(masterchef, vsUsdtLp, "oasis", vsUsdtLp, addr => `oasis-network`)(timestamp, block, chainBlocks)


    let next = await stakingLP(masterchef, roseUsdtLp, "oasis", roseUsdtLp, addr => `oasis-network`)(timestamp, block, chainBlocks)
    total['oasis-network'] = total['oasis-network'] + next['oasis-network']
    next = await stakingLP(masterchef, usdcUsdtLp, "oasis", usdcUsdtLp, addr => `oasis-network`)(timestamp, block, chainBlocks)
    total['oasis-network'] = total['oasis-network'] + next['oasis-network']
    next = await stakingLP(masterchef, btcUsdtLp, "oasis", btcUsdtLp, addr => `oasis-network`)(timestamp, block, chainBlocks)
    total['oasis-network'] = total['oasis-network'] + next['oasis-network']
    next = await stakingLP(masterchef, ethUsdtLp, "oasis", ethUsdtLp, addr => `oasis-network`)(timestamp, block, chainBlocks)
    total['oasis-network'] = total['oasis-network'] + next['oasis-network']
    // total += stakingUnknownPricedLP(masterchef, VS, "oasis", roseVstLp) * rosePrise
    return total
  }
}

module.exports = {
  timetravel: true,
  start: 411656,
  oasis: {
    tvl: calculateUsdUniTvl(
      '0x82E196Fc4dF41D529b395aE2Ce64a0FCB5d68E72',
      'oasis',
      WROSE, // WROSE
      [
        USDT, //USDT
      ],
      'oasis-network'
    ),
    // staking: staking()
    staking: stakingUnknownPricedLP(masterchef, vsUsdtLp, "oasis", vsUsdtLp, addr => `oasis-network`, 18)
  }
};



function stakingLP(stakingContract, stakingToken, chain, lpContract, transform, decimals) {
  return async (timestamp, _ethBlock, chainBlocks) => {
      const block = await getBlock(timestamp, chain, chainBlocks, true)
      const [bal, reserveAmounts, token0, token1] = await Promise.all([
          sdk.api.erc20.balanceOf({
              target: stakingToken,
              owner: stakingContract,
              chain,
              block,
          }),
          ...[getReserves, token0Abi, token1Abi].map(abi=>sdk.api.abi.call({
              target: lpContract,
              abi,
              chain,
              block
          }).then(o=>o.output))
      ])
      let token, stakedBal;
      if(token0.toLowerCase() === stakingToken.toLowerCase()){
          token = token1;
          stakedBal = BigNumber(bal.output).times(reserveAmounts[1]).div(reserveAmounts[0]).toFixed(0);
      }else {
          stakedBal = BigNumber(bal.output).times(reserveAmounts[0]).div(reserveAmounts[1]).toFixed(0);
          token = token0
      }
      if(decimals !== undefined){
          stakedBal = Number(stakedBal)/(10**decimals)
      }
      return {
          [transform?transform(token):`${chain}:${token}`]: stakedBal
      }
  }
}