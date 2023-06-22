const { assert, expect } = require("chai")
const { network, deployments, ethers } = require("hardhat")
const { developmentChains, networkConfig } = require("../../helper-hardhat-config")

// Skip the test suite if it's not a development environment
!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Raffle Unit Test", () => {
          let raffle, raffleContract, vrfCoordinatorV2Mock, mockV3Aggregator, raffleEntranceFee, accounts, player

          beforeEach(async () => {
              accounts = await ethers.getSigners()
              player = accounts[1]
              await deployments.fixture(["mocks", "raffle"])
              vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock")
              mockV3Aggregator = await ethers.getContract("MockV3Aggregator")
              raffleContract = await ethers.getContract("Raffle")
              raffle = raffleContract.connect(player)
              raffleEntranceFee = await raffle.getEntranceFeeInEth()
          })

          describe("constructor", async () => {
              it("initializes the raffle correctly", async () => {
                  const raffleState = (await raffle.getRaffleState()).toString()
                  assert.equal(raffleState, "0") // Ensure the initial state of the raffle is set to 0
              })
              it("sets the aggregator address correctly", async () => {
                  const response = await raffle.getPriceFeed()
                  assert.equal(response, mockV3Aggregator.address) // Ensure the aggregator address is set correctly
              })
              it("sets the vrfcoordinator address correctly", async () => {
                  const response = await raffle.getVRFCoordinator()
                  assert.equal(response, vrfCoordinatorV2Mock.address) // Ensure the vrfcoordinator address is set correctly
              })
          })

          describe("enterRaffle", () => {
              it("reverts when you don't pay enough ETH", async () => {
                  await expect(raffle.enterRaffle()).to.be.revertedWith("Raffle__SendMoreToEnterRaffle") // Ensure the transaction reverts if the entrance fee is not paid
              })
              it("Entering the raffle will change the state to calculation", async () => {
                  await raffle.enterRaffle({ value: raffleEntranceFee })
                  const raffleState = await raffle.getRaffleState()
                  await expect(raffle.enterRaffle({ value: raffleEntranceFee })).to.be.revertedWith(
                      "Raffle__RaffleNotOpen"
                  ) // Ensure the transaction reverts if the raffle is not open for entries
                  assert.equal(raffleState, 1) // Ensure the state is changed to 1 (calculation) after entering the raffle
              })
              it("Enter the raffle will send 10% EntranceFee to owner", async () => {
                  const owner = await raffle.getOwner()
                  const initialOwnerBalance = await raffleContract.provider.getBalance(owner)
                  await raffle.enterRaffle({ value: raffleEntranceFee })
                  const finalOwnerBalance = await raffle.provider.getBalance(owner)
                  const expectedOwnerBalance = initialOwnerBalance.add(raffleEntranceFee.div(10))
                  assert.equal(expectedOwnerBalance.toString(), finalOwnerBalance.toString()) // Ensure the owner's balance increases by 10% of the entrance fee
              })
              it("updates the requestId", async () => {
                  const txResponse = await raffle.enterRaffle({ value: raffleEntranceFee })
                  const txReceipt = await txResponse.wait(1)
                  const requestId = txReceipt.events[1].args.requestId
                  assert(requestId.toNumber() > 0) // Ensure the requestId is updated and greater than 0
              })
              it("emits the 'RequestedRaffleWinner' event on enter", async () => {
                  await expect(raffle.enterRaffle({ value: raffleEntranceFee })).to.emit(
                      raffle,
                      "RequestedRaffleWinner"
                  ) // Ensure the 'RequestedRaffleWinner' event is emitted when entering the raffle
              })
          })

          describe("fulfillRandomWords", () => {
              it("picks a winner, resets the state, and sends money", async () => {
                  await new Promise(async (resolve, reject) => {
                      raffle.once("WinnerPicked", async () => {
                          console.log("WinnerPicked event fired!")
                          try {
                              const recentWinner = await raffle.getRecentWinner()
                              const raffleState = await raffle.getRaffleState()
                              const winnerBalance = await player.getBalance()
                              assert.equal(recentWinner.toString(), accounts[1].address) // Ensure the recent winner is the expected player account
                              assert.equal(raffleState, 0) // Ensure the state is reset to 0 (idle) after picking a winner
                              assert.equal(
                                  winnerBalance.toString(),
                                  startingBalance.add(raffleBalance.mul(9).div(10)).toString()
                              ) // Ensure the winner's balance increases by 90% of the raffle balance
                              resolve()
                          } catch (e) {
                              reject(e)
                          }
                      })
                      let startingBalance, raffleBalance
                      while ((await raffle.getRecentRandNum()).toString() != "6") {
                          console.log("Entering Raffle...")
                          const txResponse = await raffle.enterRaffle({ value: raffleEntranceFee })
                          const txReceipt = await txResponse.wait(1)
                          startingBalance = await player.getBalance()
                          raffleBalance = await ethers.provider.getBalance(raffle.address)
                          await vrfCoordinatorV2Mock.fulfillRandomWords(
                              txReceipt.events[1].args.requestId,
                              raffle.address
                          )
                          console.log("random number: " + (await raffle.getRecentRandNum()).toString())
                          await new Promise((resolve) => setTimeout(resolve, 500))
                      }
                  })
              })
          })
      })
