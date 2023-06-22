const { assert } = require("chai")
const { network, getNamedAccounts, ethers } = require("hardhat")
const { developmentChains } = require("../../helper-hardhat-config")

// Skip the test if the network is a not development chain
developmentChains.includes(network.name)
    ? describe.skip
    : describe("Raffle Unit Test", () => {
          let raffle, raffleEntranceFee, deployer

          beforeEach(async () => {
              // Get the deployer account
              deployer = (await getNamedAccounts()).deployer
              // Get the Raffle contract instance
              raffle = await ethers.getContract("Raffle", deployer)
              // Get the entrance fee in ETH
              raffleEntranceFee = await raffle.getEntranceFeeInEth()
          })

          describe("fulfillRandomWords", () => {
              it("works with live Chainlink Keepers and Chainlink VRF, we get a random winner", async () => {
                  console.log("Setting up test...")
                  const accounts = await ethers.getSigners()

                  console.log("Setting up Listener...")
                  await new Promise(async (resolve, reject) => {
                      raffle.once("WinnerPicked", async () => {
                          console.log("WinnerPicked event fired!")
                          try {
                              const recentWinner = await raffle.getRecentWinner()
                              const raffleState = await raffle.getRaffleState()
                              const winnerBalance = await accounts[0].getBalance()
                              assert.equal(recentWinner.toString(), accounts[0].address)
                              assert.equal(raffleState, 0)
                              assert.equal(
                                  winnerBalance.toString(),
                                  startingBalance.add(raffleBalance.mul(9).div(10)).toString()
                              )
                              resolve()
                              console.log("Wait a few minutes") // about 30 minutes to 1 hour
                          } catch (error) {
                              console.log(error)
                              reject(error)
                          }
                      })
                      let recentRandNum = ethers.BigNumber.from(0)
                      let startingBalance, raffleBalance
                      while (recentRandNum.toString() != "6") {
                          console.log("Entering Raffle...")
                          const txResponse = await raffle.enterRaffle({
                              value: raffleEntranceFee,
                          })
                          await txResponse.wait(1)
                          startingBalance = await accounts[0].getBalance()
                          raffleBalance = await ethers.provider.getBalance(raffle.address)
                          console.log("waiting open")
                          while (true) {
                              if ((await raffle.getRaffleState()).toString() == "0") {
                                  console.log("random number: " + (await raffle.getRecentRandNum()).toString())
                                  recentRandNum = await raffle.getRecentRandNum()
                                  break
                              }
                          }
                          // Wait for 5 seconds before entering the next round
                          await new Promise((resolve) => setTimeout(resolve, 5000))
                      }
                  })
              })
          })
      })
