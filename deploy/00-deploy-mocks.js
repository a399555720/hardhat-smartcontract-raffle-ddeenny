const { network } = require("hardhat")

// Parameters for deploying VRFCoordinatorV2Mock
const BASE_FEE = "250000000000000000"
const GAS_PRICE_LINK = 1e9

// Parameters for deploying MockV3Aggregator
const DECIMALS = "8"
const INITIAL_PRICE = "200000000000" // 2000

// Deploy contracts for the mock chain.
module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()
    const chainId = network.config.chainId
    // If we are on a local development network, we need to deploy mocks!
    if (chainId == 31337) {
        log("Local network detected! Deploying mocks...")
        await deploy("VRFCoordinatorV2Mock", {
            contract: "VRFCoordinatorV2Mock",
            from: deployer,
            log: true,
            args: [BASE_FEE, GAS_PRICE_LINK],
        })

        await deploy("MockV3Aggregator", {
            contract: "MockV3Aggregator",
            from: deployer,
            log: true,
            args: [DECIMALS, INITIAL_PRICE],
        })

        log("Mocks Deployed!")
        log("----------------------------------------------------------")
        log("You are deploying to a local network, you'll need a local network running to interact")
        log("Please run `yarn hardhat console --network localhost` to interact with the deployed smart contracts!")
        log("----------------------------------------------------------")
    }
}
module.exports.tags = ["all", "mocks"]
