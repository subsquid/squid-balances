import { BatchContext, SubstrateBlock } from '@subsquid/substrate-processor'
import { Store } from '@subsquid/typeorm-store'
import { Account, ChainState, CurrentChainState } from './model'
import { UnknownVersionError } from './processor'
import {
    BalancesTotalIssuanceStorage,
    GeneralCouncilMembersStorage,
    GeneralCouncilProposalCountStorage,
    DemocracyPublicPropCountStorage,
} from './types/generated/storage'
// import { PERIOD } from './consts/consts'
import { Block, ChainContext } from './types/generated/support'
// import chains from './consts/chains'
// import config from './config'
// import { UnknownVersionError } from './common/errors'
// import { ChainInfo } from './common/types'

export async function getChainState(ctx: BatchContext<Store, unknown>, block: SubstrateBlock) {
    const state = new ChainState({ id: block.id })

    state.timestamp = new Date(block.timestamp)
    state.blockNumber = block.height
    state.councilMembers = (await getCouncilMembers(ctx, block))?.length || 0
    state.councilProposals = (await getCouncilProposalsCount(ctx, block)) || 0
    state.democracyProposals = (await getDemocracyProposalsCount(ctx, block)) || 0
    state.tokenBalance = (await getTotalIssuance(ctx, block)) || 0n

    state.tokenHolders = await ctx.store.count(Account)

    return state
}

export async function saveRegularChainState(ctx: BatchContext<Store, unknown>, block: SubstrateBlock) {
    const state = await getChainState(ctx, block)
    await ctx.store.insert(state)

    ctx.log.child('state').info(`updated at block ${block.height}`)
}

export async function saveCurrentChainState(ctx: BatchContext<Store, unknown>, block: SubstrateBlock) {
    const state = await getChainState(ctx, block)
    await ctx.store.save(new CurrentChainState({ ...state, id: '0' }))
}

async function getCouncilMembers(ctx: ChainContext, block: Block) {
    const storage = new GeneralCouncilMembersStorage(ctx, block)
    if (!storage.isExists) return undefined

    if (storage.isV2000) {
        return await storage.getAsV2000()
    }

    throw new UnknownVersionError(storage.constructor.name)
}

async function getCouncilProposalsCount(ctx: ChainContext, block: Block) {
    const storage = new GeneralCouncilProposalCountStorage(ctx, block)
    if (!storage.isExists) return undefined

    if (storage.isV2000) {
        return await storage.getAsV2000()
    }

    throw new UnknownVersionError(storage.constructor.name)
}

async function getDemocracyProposalsCount(ctx: ChainContext, block: Block) {
    const storage = new DemocracyPublicPropCountStorage(ctx, block)
    if (!storage.isExists) return undefined

    if (storage.isV2000) {
        return await storage.getAsV2000()
    }

    throw new UnknownVersionError(storage.constructor.name)
}

async function getTotalIssuance(ctx: ChainContext, block: Block) {
    const storage = new BalancesTotalIssuanceStorage(ctx, block)
    if (!storage.isExists) return undefined

    if (storage.isV2000) {
        return await storage.getAsV2000()
    }

    throw new UnknownVersionError(storage.constructor.name)
}
