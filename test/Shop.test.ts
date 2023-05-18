import {expect} from "chai";
import {ethers} from "hardhat";
import {loadFixture, time, setBalance} from "@nomicfoundation/hardhat-network-helpers";
import tokenArtefact from "../artifacts/contracts/Token.sol/Token.json";

const baseUri = "https://w3s.link/ipfs/bafybeiaxf7knol6sueq26vegx2j3rq4ra3d56k3gfryaqzap6awjyr64em/";

describe("Shop", () => {

    async function deployFixture() {
        const [owner, buyer, seller] = await ethers.getSigners();
        const shopFactory = await ethers.getContractFactory("Shop");
        const shop = await shopFactory.deploy();
        await shop.deployed();

        //new ethers.Contract( address , abi , signerOrProvider )
        const shopSigner = shopFactory.signer;
        const token = new ethers.Contract(await shop.token(), tokenArtefact.abi, shopSigner);
        return {
            owner, buyer, seller, shop, token
        }
    }

    describe("DEPLOY", () => {

        it("shop balances", async () => {
            const {owner, buyer, seller, shop, token} = await loadFixture(deployFixture);
            const adr = shop.address;
            const balances = await token.balanceOfBatch(
                [adr, adr, adr, adr, adr],
                [0, 1, 2, 3, 4]
            );
            expect(balances[0]).to.equal(10 ** 6);
            expect(balances[1]).to.equal(10 ** 6);
            expect(balances[2]).to.equal(10 ** 3);
            expect(balances[3]).to.equal(10 ** 3);
            expect(balances[4]).to.equal(1);
        });

        it("uri", async () => {
            const {token} = await loadFixture(deployFixture);
            expect(await token.uri(0)).to.equal(baseUri + "0.json");
            expect(await token.uri(1)).to.equal(baseUri + "1.json");
            expect(await token.uri(2)).to.equal(baseUri + "2.json");
            expect(await token.uri(3)).to.equal(baseUri + "3.json");
            expect(await token.uri(4)).to.equal(baseUri + "4.json");
        })

    })

    describe("Price Buy", () => {

        it("getPricesBuy", async () => {
            const {owner, buyer, seller, shop, token} = await loadFixture(deployFixture);
            expect((await shop.getPricesBuy())[0]).to.equal(100);
            expect((await shop.getPricesBuy())[1]).to.equal(101);
            expect((await shop.getPricesBuy())[2]).to.equal(102);
            expect((await shop.getPricesBuy())[3]).to.equal(103);
            expect((await shop.getPricesBuy())[4]).to.equal(104);
        })

        it("setPriceBuy - revert if not an owner", async () => {
            const {owner, buyer, seller, shop, token} = await loadFixture(deployFixture);
            await expect(shop.connect(seller).setPriceBuy(0, 200))
                .to.be.revertedWith("Ownable: caller is not the owner");
        })

        it("setPriceBuy - revert if id in range", async () => {
            const {owner, buyer, seller, shop, token} = await loadFixture(deployFixture);
            await expect(shop.connect(owner).setPriceBuy(55, 200))
                .to.be.revertedWith("Shop: token id out of range");
        })

        it("setPriceBuy - getPricesBuy", async () => {
            const {owner, buyer, seller, shop, token} = await loadFixture(deployFixture);
            const tokenId = 0;
            const price = 200;
            const tx = await shop.connect(owner).setPriceBuy(tokenId, price);
            await tx.wait();
            expect((await shop.getPricesBuy())[tokenId]).to.equal(price);
        })

        it("setPriceBuy - emit event", async () => {
            const {owner, buyer, seller, shop, token} = await loadFixture(deployFixture);
            const tokenId = 0;
            const price = 200;
            const oldPrice = (await shop.getPricesBuy())[tokenId];
            const timestamp = 10000000000;
            await time.setNextBlockTimestamp(timestamp);
            await expect(shop.connect(owner).setPriceBuy(tokenId, price))
                .to.emit(shop, "PriceBuy")
                .withArgs(tokenId, oldPrice, price, timestamp);
        })
    })

    describe("Price Sell", () => {

        it("getPricesSell", async () => {
            const {owner, buyer, seller, shop, token} = await loadFixture(deployFixture);
            expect((await shop.getPricesSell())[0]).to.equal(90);
            expect((await shop.getPricesSell())[1]).to.equal(91);
            expect((await shop.getPricesSell())[2]).to.equal(92);
            expect((await shop.getPricesSell())[3]).to.equal(93);
            expect((await shop.getPricesSell())[4]).to.equal(94);
        })

        it("setPriceSell - revert if not an owner", async () => {
            const {owner, buyer, seller, shop, token} = await loadFixture(deployFixture);
            await expect(shop.connect(seller).setPriceSell(0, 200))
                .to.be.revertedWith("Ownable: caller is not the owner");
        })

        it("setPriceSell - revert if id in range", async () => {
            const {owner, buyer, seller, shop, token} = await loadFixture(deployFixture);
            await expect(shop.connect(owner).setPriceSell(55, 200))
                .to.be.revertedWith("Shop: token id out of range");
        })

        it("setPriceSell - getPricesSell", async () => {
            const {owner, buyer, seller, shop, token} = await loadFixture(deployFixture);
            const tokenId = 0;
            const price = 200;
            const tx = await shop.connect(owner).setPriceSell(tokenId, price);
            await tx.wait();
            expect((await shop.getPricesSell())[tokenId]).to.equal(price);
        })

        it("setPriceSell - emit event", async () => {
            const {owner, buyer, seller, shop, token} = await loadFixture(deployFixture);
            const tokenId = 0;
            const price = 200;
            const oldPrice = (await shop.getPricesSell())[tokenId];
            const timestamp = 10000000000;
            await time.setNextBlockTimestamp(timestamp);
            await expect(shop.connect(owner).setPriceSell(tokenId, price))
                .to.emit(shop, "PriceSell")
                .withArgs(tokenId, oldPrice, price, timestamp);
        })
    })

    describe("BUY", () => {

        it("reverted if token id is out of range", async () => {
            const {buyer, shop} = await loadFixture(deployFixture);
            const tokenId = 111;
            const amount = 1;
            const value = 100;
            await expect(shop.connect(buyer).buy(tokenId, amount, {value}))
                .to.be.revertedWith("Shop: token id out of range");
        })

        it("reverted if amount = 0", async () => {
            const {owner, buyer, seller, shop} = await loadFixture(deployFixture);
            const tokenId = 1;
            const amount = 0;
            const value = 100;
            await expect(shop.connect(buyer).buy(tokenId, amount, {value}))
                .to.be.revertedWith("Shop: amount could not be equal 0");
        })

        it("reverted if buyer don't sent required amount of ether", async () => {
            const {owner, buyer, seller, shop} = await loadFixture(deployFixture);
            const tokenId = 1;
            const amount = 3;
            const price = ((await shop.getPricesBuy())[tokenId]).toNumber();
            const value = amount * price - 1;
            await expect(shop.connect(buyer).buy(tokenId, amount, {value}))
                .to.be.revertedWith("Shop: not enough ether");
        })

        it("reverted if shop don't have enough tokens", async () => {
            const {owner, buyer, seller, shop, token} = await loadFixture(deployFixture);
            const tokenId = 1;
            const amount = (10 ** 6) + 1;
            const price = ((await shop.getPricesBuy())[tokenId]).toNumber();
            const value = amount * price;
            await expect(shop.connect(buyer).buy(tokenId, amount, {value}))
                .to.be.revertedWith("Shop: shop doesn't have enough tokens");
        })

        it("buying tokens properly change token's balance of buyer and shop", async () => {
            const {owner, buyer, seller, shop, token} = await loadFixture(deployFixture);
            const tokenId = 1;
            const amount = (10 ** 3);
            const price = ((await shop.getPricesBuy())[tokenId]).toNumber();
            const buyerBalanceBefore = await token.balanceOf(buyer.address, tokenId);
            const shopBalanceBefore = await token.balanceOf(shop.address, tokenId);
            //console.log(buyerBalanceBefore, shopBalanceBefore);
            const value = amount * price;
            // buy
            const tx = await shop.connect(buyer).buy(tokenId, amount, {value});
            await tx.wait();

            const buyerBalanceAfter = await token.balanceOf(buyer.address, tokenId);
            const shopBalanceAfter = await token.balanceOf(shop.address, tokenId);
            //console.log(buyerBalanceAfter, shopBalanceAfter);
            expect(buyerBalanceAfter - buyerBalanceBefore).to.equal(amount);
            expect(shopBalanceAfter - shopBalanceBefore).to.equal(-amount);
        })

        it("buying tokens properly change ether balance of buyer and shop", async () => {
            const {owner, buyer, seller, shop, token} = await loadFixture(deployFixture);
            const tokenId = 1;
            const amount = (10 ** 3);
            const price = ((await shop.getPricesBuy())[tokenId]).toNumber();
            const value = amount * price;
            // buy
            await expect(shop.connect(buyer).buy(tokenId, amount, {value}))
                .to.changeEtherBalances([buyer, shop], [-value, +value]);
        })

        it("emit event", async () => {
            const {owner, buyer, seller, shop, token} = await loadFixture(deployFixture);
            const tokenId = 1;
            const amount = (10 ** 3);
            const price = ((await shop.getPricesBuy())[tokenId]).toNumber();
            const value = amount * price;
            // buy
            const timestamp = 10000000000;
            await time.setNextBlockTimestamp(timestamp);
            await expect(shop.connect(buyer).buy(tokenId, amount, {value}))
                .to.emit(shop, "Buy")
                .withArgs(buyer.address, tokenId, amount, price, timestamp);
        })
    })

    describe("BUY BATCH", () => {

        it("reverted if ids and amounts length mismatch", async () => {
            const {buyer, shop} = await loadFixture(deployFixture);
            const ids = [0, 1];
            const amounts = [1, 1, 1];
            const value = 100;
            await expect(shop.connect(buyer).buyBatch(ids, amounts, {value}))
                .to.be.revertedWith("Shop: ids and amounts length mismatch");
        })

        it("reverted if token id is out of range", async () => {
            const {buyer, shop} = await loadFixture(deployFixture);
            const ids = [0, 1, 11];
            const amounts = [1, 1, 1];
            const value = 100;
            await expect(shop.connect(buyer).buyBatch(ids, amounts, {value}))
                .to.be.revertedWith("Shop: token id out of range");
        })

        it("reverted if amount = 0", async () => {
            const {owner, buyer, seller, shop} = await loadFixture(deployFixture);
            const ids = [0, 1, 2];
            const amounts = [1, 0, 1];
            const value = 100;
            await expect(shop.connect(buyer).buyBatch(ids, amounts, {value}))
                .to.be.revertedWith("Shop: amount could not be equal 0");
        })

        it("reverted if shop don't have enough tokens", async () => {
            const {buyer, shop} = await loadFixture(deployFixture);
            const ids = [0, 1];
            const amounts = [10 ** 6, 10 ** 6 + 1];
            const value = 100;
            await expect(shop.connect(buyer).buyBatch(ids, amounts, {value}))
                .to.be.revertedWith("Shop: shop doesn't have enough tokens");
        })

        it("reverted if buyer don't sent required amount of ether", async () => {
            const {buyer, shop} = await loadFixture(deployFixture);
            const ids = [0, 1, 2, 3];
            const amounts = [1, 2, 3, 4];
            const prices = await shop.getPricesBuy();

            let value = 0;
            for (let i = 0; i < ids.length; i++) {
                value = value + prices[ids[i]].toNumber() * amounts[i];
            }
            await expect(shop.connect(buyer).buyBatch(ids, amounts, {value: value - 1}))
                .to.be.revertedWith("Shop: not enough ether");
        })

        it("buying tokens properly change token's balance of buyer and shop", async () => {
            const {buyer, shop, token} = await loadFixture(deployFixture);
            const ids = [0, 2, 3];
            const amounts = [1, 3, 4];
            const prices = await shop.getPricesBuy();

            let value = 0;
            const buyerBalancesBefore = [] as number[];
            const shopBalancesBefore = [] as number[];
            for (let i = 0; i < ids.length; i++) {
                const buyerBalance = await token.balanceOf(buyer.address, ids[i]);
                const shopBalance = await token.balanceOf(shop.address, ids[i]);
                buyerBalancesBefore.push(buyerBalance);
                shopBalancesBefore.push(shopBalance);
                value = value + amounts[i] * prices[ids[i]].toNumber();
            }
            //console.log(buyerBalancesBefore, shopBalancesBefore);

            // buy
            const tx = await shop.connect(buyer).buyBatch(ids, amounts, {value});
            await tx.wait();

            const buyerBalancesAfter = [] as number[];
            const shopBalancesAfter = [] as number[];
            for (let i = 0; i < ids.length; i++) {
                const buyerBalance = await token.balanceOf(buyer.address, ids[i]);
                const shopBalance = await token.balanceOf(shop.address, ids[i]);
                buyerBalancesAfter.push(buyerBalance);
                shopBalancesAfter.push(shopBalance);
            }
            //console.log(buyerBalancesAfter, shopBalancesAfter);
            for (let i = 0; i < amounts.length; i++) {
                expect(buyerBalancesAfter[i] - buyerBalancesBefore[i]).to.equal(amounts[i]);
                expect(shopBalancesAfter[i] - shopBalancesBefore[i]).to.equal(-amounts[i]);
            }
        })

        it("buying tokens properly change ether balance of buyer and shop", async () => {
            const {buyer, shop} = await loadFixture(deployFixture);
            const ids = [0, 2, 3];
            const amounts = [1, 3, 4];
            const prices = await shop.getPricesBuy();

            let value = 0;
            for (let i = 0; i < ids.length; i++) {
                value = value + prices[ids[i]].toNumber() * amounts[i];
            }
            // buy
            await expect(shop.connect(buyer).buyBatch(ids, amounts, {value}))
                .to.changeEtherBalances([buyer, shop], [-value, +value]);
        })

        it("emit event", async () => {
            const {buyer, shop} = await loadFixture(deployFixture);
            const ids = [0, 2, 3];
            const amounts = [1, 3, 4];
            const prices = await shop.getPricesBuy();

            let value = 0;
            let pricesInEvent = [];
            for (let i = 0; i < ids.length; i++) {
                value = value + prices[ids[i]].toNumber() * amounts[i];
                pricesInEvent[i] = prices[ids[i]];
            }
            // buy
            const timestamp = 10000000000;
            await time.setNextBlockTimestamp(timestamp);
            await expect(shop.connect(buyer).buyBatch(ids, amounts, {value}))
                .to.emit(shop, "BuyBatch")
                .withArgs(buyer.address, ids, amounts, pricesInEvent, timestamp);
        });

    })

    describe("SELL", () => {

        it("reverted if token id is out of range", async () => {
            const {seller, shop} = await loadFixture(deployFixture);
            const tokenId = 34;
            const amount = 10;
            await expect(shop.connect(seller).sell(tokenId, amount))
                .to.be.revertedWith("Shop: token id out of range");
        });

        it("reverted if amount = 0", async () => {
            const {seller, shop} = await loadFixture(deployFixture);
            const tokenId = 3;
            const amount = 0;
            await expect(shop.connect(seller).sell(tokenId, amount))
                .to.be.revertedWith("Shop: amount could not be equal 0");
        });

        it("reverted if seller doesn't have enough tokens", async () => {
            const {seller, shop} = await loadFixture(deployFixture);
            const tokenId = 3;
            const amount = 1;
            await expect(shop.connect(seller).sell(tokenId, amount))
                .to.be.revertedWith("Shop: seller doesn't have enough tokens");
        })

        it("reverted if shop is not operator for seller", async () => {
            const {seller, shop} = await loadFixture(deployFixture);
            const tokenId = 3;
            const amount = 2;
            // buy
            const tx = await shop.connect(seller).buy(tokenId, amount, {value: 103 * amount});
            await tx.wait();
            // set shop balance
            await setBalance(shop.address, 1000000);
            // try to sell
            await expect(shop.connect(seller).sell(tokenId, amount))
                .to.be.revertedWith("Shop: shop is not operator for seller");
        })

        it("reverted if shop has not enough ether", async () => {
            const {seller, shop, token} = await loadFixture(deployFixture);
            const tokenId = 3;
            const amount = 2;
            // buy
            const tx = await shop.connect(seller).buy(tokenId, amount, {value: 103 * amount});
            await tx.wait();
            // set approval for shop
            const approvalTx = await token.connect(seller).setApprovalForAll(shop.address, true);
            await approvalTx.wait();
            // set shop balance to 0
            await setBalance(shop.address, 0);
            // try to sell
            await expect(shop.connect(seller).sell(tokenId, amount))
                .to.be.revertedWith("Shop: shop has not enough ether");
        });

        it("selling tokens properly change token's balance of buyer and shop", async () => {
            const {owner, buyer, seller, shop, token} = await loadFixture(deployFixture);
            const tokenId = 3;
            const amount = 2;
            // buy
            const buyTx = await shop.connect(seller).buy(tokenId, amount, {value: 103 * amount});
            await buyTx.wait();
            // set approval for shop
            const approvalTx = await token.connect(seller).setApprovalForAll(shop.address, true);
            await approvalTx.wait();

            const sellerBalanceBefore = await token.balanceOf(seller.address, tokenId);
            const shopBalanceBefore = await token.balanceOf(shop.address, tokenId);
            // sell
            const sellTx = await shop.connect(seller).sell(tokenId, amount);
            await sellTx.wait();

            const sellerBalanceAfter = await token.balanceOf(seller.address, tokenId);
            const shopBalanceAfter = await token.balanceOf(shop.address, tokenId);
            //console.log(buyerBalanceAfter, shopBalanceAfter);
            expect(sellerBalanceAfter - sellerBalanceBefore).to.equal(-amount);
            expect(shopBalanceAfter - shopBalanceBefore).to.equal(+amount);
        })

        it("selling tokens properly change ether balance of buyer and shop", async () => {
            const {seller, shop, token} = await loadFixture(deployFixture);
            const tokenId = 3;
            const amount = 2;
            const priceBuy = (await shop.getPricesBuy())[tokenId].toNumber();
            // buy
            const buyTx = await shop.connect(seller).buy(tokenId, amount, {value: priceBuy * amount});
            await buyTx.wait();
            // set approval for shop
            const approvalTx = await token.connect(seller).setApprovalForAll(shop.address, true);
            await approvalTx.wait();

            // sell
            const priceSell = (await shop.getPricesSell())[tokenId].toNumber();
            await expect(shop.connect(seller).sell(tokenId, amount))
                .to.changeEtherBalances([seller, shop], [+priceSell * amount, -priceSell * amount]);
        })

        it("emit event", async () => {
            const {owner, buyer, seller, shop, token} = await loadFixture(deployFixture);
            const tokenId = 3;
            const amount = 2;
            // buy
            const buyTx = await shop.connect(seller).buy(tokenId, amount, {value: 103 * amount});
            await buyTx.wait();
            // set approval for shop
            const approvalTx = await token.connect(seller).setApprovalForAll(shop.address, true);
            await approvalTx.wait();
            // sell
            const timestamp = 10000000000;
            await time.setNextBlockTimestamp(timestamp);
            const priceSell = (await shop.getPricesSell())[tokenId].toNumber();
            await expect(shop.connect(seller).sell(tokenId, amount))
                .to.emit(shop, "Sell")
                .withArgs(seller.address, tokenId, amount, priceSell, timestamp);
        });

    });

    describe("SELL BATCH", () => {

        it("reverted if ids and amounts length mismatch", async () => {
            const {seller, shop} = await loadFixture(deployFixture);
            const ids = [0, 1];
            const amounts = [1, 1, 1];
            await expect(shop.connect(seller).sellBatch(ids, amounts))
                .to.be.revertedWith("Shop: ids and amounts length mismatch");
        });

        it("reverted if token id is out of range", async () => {
            const {seller, shop} = await loadFixture(deployFixture);
            const ids = [11, 1, 2];
            const amounts = [1, 1, 1];
            await expect(shop.connect(seller).sellBatch(ids, amounts))
                .to.be.revertedWith("Shop: token id out of range");
        });

        it("reverted if amount = 0", async () => {
            const {seller, shop} = await loadFixture(deployFixture);
            const ids = [0, 1, 2];
            // buy
            const buyTx = await shop.connect(seller).buyBatch([0, 1, 2], [1, 1, 1], {value: 303});
            await buyTx.wait();
            // set shop balance
            await setBalance(shop.address, 1000000000);

            const amounts = [1, 0, 1];
            await expect(shop.connect(seller).sellBatch(ids, amounts))
                .to.be.revertedWith("Shop: amount could not be equal 0");
        })

        it("reverted if seller don't have enough tokens", async () => {
            const {seller, shop} = await loadFixture(deployFixture);
            const ids = [0, 1, 2];
            const amounts = [2, 1, 1];
            // buy
            const buyTx = await shop.connect(seller).buyBatch([0, 1, 2], [1, 1, 1], {value: 303});
            await buyTx.wait();
            // try to sell
            await expect(shop.connect(seller).sellBatch(ids, amounts))
                .to.be.revertedWith("Shop: seller doesn't have enough tokens");
        })

        it("reverted if shop is not operator for seller", async () => {
            const {seller, shop, token} = await loadFixture(deployFixture);
            const ids = [0, 1, 2];
            const amounts = [1, 1, 1];
            // buy
            const buyTx = await shop.connect(seller).buyBatch([0, 1, 2], [1, 1, 1], {value: 303});
            await buyTx.wait();
            // try to sell
            await expect(shop.connect(seller).sellBatch(ids, amounts))
                .to.be.revertedWith("Shop: shop is not operator for seller");
        })

        it("reverted if shop has not enough ether", async () => {
            const {seller, shop, token} = await loadFixture(deployFixture);
            const ids = [0, 1, 2];
            const amounts = [1, 1, 1];
            // buy
            const buyTx = await shop.connect(seller).buyBatch([0, 1, 2], [1, 1, 1], {value: 303});
            await buyTx.wait();
            // set shop balance
            await setBalance(shop.address, 0);
            // set approval for shop
            const approvalTx = await token.connect(seller).setApprovalForAll(shop.address, true);
            await approvalTx.wait();
            // try to sell
            await expect(shop.connect(seller).sellBatch(ids, amounts))
                .to.be.revertedWith("Shop: shop has not enough ether");
        })

        it("selling tokens properly change token's balance of buyer and shop", async () => {
            const {seller, shop, token} = await loadFixture(deployFixture);
            const ids = [0, 1, 2];
            const amounts = [1, 1, 1];
            // buy
            const buyTx = await shop.connect(seller).buyBatch([0, 1, 2], [1, 1, 1], {value: 303});
            await buyTx.wait();
            // set approval for shop
            const approvalTx = await token.connect(seller).setApprovalForAll(shop.address, true);
            await approvalTx.wait();


            const sellerBalancesBefore = [] as number[];
            const shopBalancesBefore = [] as number[];
            for (let i = 0; i < ids.length; i++) {
                const sellerBalanceBefore = await token.balanceOf(seller.address, ids[i]);
                const shopBalanceBefore = await token.balanceOf(shop.address, ids[i]);
                sellerBalancesBefore.push(sellerBalanceBefore);
                shopBalancesBefore.push(shopBalanceBefore);
            }
            // console.log(sellerBalancesBefore)
            // console.log(shopBalancesBefore)

            // sell
            const sellTx = await shop.connect(seller).sellBatch(ids, amounts);
            await sellTx.wait();

            const sellerBalancesAfter = [] as number[];
            const shopBalancesAfter = [] as number[];
            for (let i = 0; i < ids.length; i++) {
                const sellerBalanceAfter = await token.balanceOf(seller.address, ids[i]);
                const shopBalanceAfter = await token.balanceOf(shop.address, ids[i]);
                sellerBalancesAfter.push(sellerBalanceAfter);
                shopBalancesAfter.push(shopBalanceAfter);
            }

            for (let i = 0; i < ids.length; i++) {
                expect(sellerBalancesAfter[i] - sellerBalancesBefore[i]).to.equal(-amounts[i]);
                expect(shopBalancesAfter[i] - shopBalancesBefore[i]).to.equal(+amounts[i]);
            }
        })

        it("selling tokens properly change token's balance of buyer and shop", async () => {
            const {seller, shop, token} = await loadFixture(deployFixture);
            const ids = [0, 1, 2];
            const amounts = [1, 1, 1];
            // buy
            const buyTx = await shop.connect(seller).buyBatch([0, 1, 2], [1, 1, 1], {value: 303});
            await buyTx.wait();
            // set approval for shop
            const approvalTx = await token.connect(seller).setApprovalForAll(shop.address, true);
            await approvalTx.wait();

            // sell
            let value = 0;
            const pricesSell = await shop.getPricesSell();
            for (let i = 0; i < ids.length; i++) {
                value = value + pricesSell[ids[i]].toNumber() * amounts[i];
            }
            await expect(shop.connect(seller).sellBatch(ids, amounts))
                .to.changeEtherBalances([seller, shop], [+value, -value]);

        })

        it("emit event", async () => {
            const {seller, shop, token} = await loadFixture(deployFixture);
            const ids = [0, 1, 2];
            const amounts = [1, 1, 1];
            // buy
            const buyTx = await shop.connect(seller).buyBatch([0, 1, 2], [1, 1, 1], {value: 303});
            await buyTx.wait();
            // set approval for shop
            const approvalTx = await token.connect(seller).setApprovalForAll(shop.address, true);
            await approvalTx.wait();

            // sell
            const timestamp = 10000000000;
            await time.setNextBlockTimestamp(timestamp);
            let value = 0;
            const prices = [] as number[];
            const pricesSell = await shop.getPricesSell();
            for (let i = 0; i < ids.length; i++) {
                value = value + pricesSell[ids[i]].toNumber() * amounts[i];
                prices.push(pricesSell[ids[i]].toNumber());
            }
            await expect(shop.connect(seller).sellBatch(ids, amounts))
                .emit(shop, "SellBatch")
                .withArgs(seller.address, ids, amounts, prices, timestamp);

        })
    })

    describe("MINT TO SHOP", () => {

        it("revert if caller is not an owner", async () => {
            const {seller, buyer, shop, token} = await loadFixture(deployFixture);
            const tokenId = 1;
            const amount = 5;
            await expect(shop.connect(seller).mintToShop(tokenId, amount))
                .to.be.revertedWith("Ownable: caller is not the owner");
            await expect(shop.connect(buyer).mintToShop(tokenId, amount))
                .to.be.revertedWith("Ownable: caller is not the owner");
        })

        it("revert if token id out of range", async () => {
            const {owner, shop} = await loadFixture(deployFixture);
            const tokenId = 123;
            const amount = 5;
            await expect(shop.connect(owner).mintToShop(tokenId, amount))
                .to.be.revertedWith("Shop: token id out of range");
        });

        it("revert if amount is 0", async () => {
            const {owner, shop} = await loadFixture(deployFixture);
            const tokenId = 1;
            const amount = 0;
            await expect(shop.connect(owner).mintToShop(tokenId, amount))
                .to.be.revertedWith("Shop: amount of minted tokens could not to be equal 0");
        });

        it("mint change token balance of shop", async () => {
            const {owner, shop, token} = await loadFixture(deployFixture);
            const tokenId = 1;
            const amount = 123;
            const balanceBefore = await token.balanceOf(shop.address, tokenId);
            const mintTx = await shop.connect(owner).mintToShop(tokenId, amount);
            await mintTx.wait();
            const balanceAfter = await token.balanceOf(shop.address, tokenId);
            expect(balanceAfter - balanceBefore)
                .to.equal(amount);
        });

        it("emit event", async () => {
            const {owner, shop, token} = await loadFixture(deployFixture);
            const timestamp = 10000000000;
            await time.setNextBlockTimestamp(timestamp);
            const tokenId = 1;
            const amount = 123;
            await expect(shop.connect(owner).mintToShop(tokenId, amount))
                .emit(shop, "Mint")
                .withArgs(tokenId, amount, timestamp);
        });
    });

    describe("MINT BATCH TO SHOP", () => {

        it("revert if caller is not an owner", async () => {
            const {seller, buyer, shop} = await loadFixture(deployFixture);
            const ids = [0, 2, 4];
            const amounts = [11, 22, 33];
            await expect(shop.connect(seller).mintBatchToShop(ids, amounts))
                .to.be.revertedWith("Ownable: caller is not the owner");
            await expect(shop.connect(buyer).mintBatchToShop(ids, amounts))
                .to.be.revertedWith("Ownable: caller is not the owner");
        })

        it("revert if token id out of range", async () => {
            const {owner, shop} = await loadFixture(deployFixture);
            const ids = [10, 12, 14];
            const amounts = [11, 22, 33];
            await expect(shop.connect(owner).mintBatchToShop(ids, amounts))
                .to.be.revertedWith("Shop: token id out of range");
        });

        it("revert if amount is 0", async () => {
            const {owner, shop} = await loadFixture(deployFixture);
            const ids = [1, 2, 4];
            const amounts = [11, 0, 33];
            await expect(shop.connect(owner).mintBatchToShop(ids, amounts))
                .to.be.revertedWith("Shop: amount of minted tokens could not to be equal 0");
        });

        it("mint change token balance of shop", async () => {
            const {owner, shop, token} = await loadFixture(deployFixture);
            const ids = [1, 2, 4];
            const amounts = [11, 22, 33];
            const balancesBefore = await token.balanceOfBatch([shop.address, shop.address, shop.address], ids);
            const mintTx = await shop.connect(owner).mintBatchToShop(ids, amounts);
            await mintTx.wait();
            const balancesAfter = await token.balanceOfBatch([shop.address, shop.address, shop.address], ids);
            for (let i = 0; i < ids.length; i++) {
                expect(balancesAfter[i] - balancesBefore[i]).to.equal(amounts[i]);
            }
        });

        it("emit event", async () => {
            const {owner, shop, token} = await loadFixture(deployFixture);
            const ids = [1, 2, 4];
            const amounts = [11, 22, 33];
            const timestamp = 10000000000;
            await time.setNextBlockTimestamp(timestamp);
            await expect(shop.connect(owner).mintBatchToShop(ids, amounts))
                .emit(shop, "MintBatch")
                .withArgs(ids, amounts, timestamp);
        });
    });

    describe("BURN FROM SHOP", () => {

        it("revert if caller is not an owner", async () => {
            const {seller, buyer, shop} = await loadFixture(deployFixture);
            const tokenId = 1;
            const amount = 123;
            await expect(shop.connect(seller).burnFromShop(tokenId, amount))
                .to.be.revertedWith("Ownable: caller is not the owner");
            await expect(shop.connect(buyer).burnFromShop(tokenId, amount))
                .to.be.revertedWith("Ownable: caller is not the owner");
        });

        it("revert if token id out of range", async () => {
            const {owner, shop} = await loadFixture(deployFixture);
            const tokenId = 11;
            const amount = 123;
            await expect(shop.connect(owner).burnFromShop(tokenId, amount))
                .to.be.revertedWith("Shop: token id out of range");
        });

        it("revert if amount is 0", async () => {
            const {owner, shop} = await loadFixture(deployFixture);
            const tokenId = 1;
            const amount = 0;
            await expect(shop.connect(owner).burnFromShop(tokenId, amount))
                .to.be.revertedWith("Shop: amount of burned tokens could not to be equal 0");
        });

        it("burn change token balance of shop", async () => {
            const {owner, shop, token} = await loadFixture(deployFixture);
            const tokenId = 1;
            const amount = 123;
            const balanceBefore = await token.balanceOf(shop.address, tokenId);
            const burnTx = await shop.connect(owner).burnFromShop(tokenId, amount);
            await burnTx.wait();
            const balanceAfter = await token.balanceOf(shop.address, tokenId);
            expect(balanceAfter - balanceBefore)
                .to.equal(-amount);
        });

        it("emit event", async () => {
            const {owner, shop} = await loadFixture(deployFixture);
            const timestamp = 10000000000;
            await time.setNextBlockTimestamp(timestamp);
            const tokenId = 1;
            const amount = 123;
            await expect(shop.connect(owner).burnFromShop(tokenId, amount))
                .emit(shop, "Burn")
                .withArgs(tokenId, amount, timestamp);
        });
    });

    describe("BURN BATCH FROM SHOP", () => {

        it("revert if caller is not an owner", async () => {
            const {seller, buyer, shop} = await loadFixture(deployFixture);
            const ids = [0, 2, 4];
            const amounts = [11, 22, 33];
            await expect(shop.connect(seller).burnBatchFromShop(ids, amounts))
                .to.be.revertedWith("Ownable: caller is not the owner");
            await expect(shop.connect(buyer).burnBatchFromShop(ids, amounts))
                .to.be.revertedWith("Ownable: caller is not the owner");
        })

        it("revert if token id out of range", async () => {
            const {owner, shop} = await loadFixture(deployFixture);
            const ids = [10, 12, 14];
            const amounts = [11, 22, 33];
            await expect(shop.connect(owner).burnBatchFromShop(ids, amounts))
                .to.be.revertedWith("Shop: token id out of range");
        });

        it("revert if amount is 0", async () => {
            const {owner, shop} = await loadFixture(deployFixture);
            const ids = [1, 2, 4];
            const amounts = [11, 0, 33];
            await expect(shop.connect(owner).burnBatchFromShop(ids, amounts))
                .to.be.revertedWith("Shop: amount of burned tokens could not to be equal 0");
        });

        it("burn batch change token balance of shop", async () => {
            const {owner, shop, token} = await loadFixture(deployFixture);
            const ids = [1, 2, 3];
            const amounts = [11, 22, 33];
            const balancesBefore = await token.balanceOfBatch([shop.address, shop.address, shop.address], ids);
            const burnTx = await shop.connect(owner).burnBatchFromShop(ids, amounts);
            await burnTx.wait();
            const balancesAfter = await token.balanceOfBatch([shop.address, shop.address, shop.address], ids);
            for (let i = 0; i < ids.length; i++) {
                expect(balancesAfter[i] - balancesBefore[i]).to.equal(-amounts[i]);
            }
        });

        it("emit event", async () => {
            const {owner, shop, token} = await loadFixture(deployFixture);
            const ids = [1, 2, 3];
            const amounts = [11, 22, 33];
            const timestamp = 10000000000;
            await time.setNextBlockTimestamp(timestamp);
            await expect(shop.connect(owner).burnBatchFromShop(ids, amounts))
                .emit(shop, "BurnBatch")
                .withArgs(ids, amounts, timestamp);
        });

    });

    describe("GET SHOP BALANCE", () => {

        it("only owner", async () => {
            const {owner, seller, buyer, shop, token} = await loadFixture(deployFixture);
            await expect(shop.connect(seller).getShopBalance())
                .to.be.revertedWith("Ownable: caller is not the owner");
        })

        it("return proper value", async () => {
            const {owner, seller, buyer, shop, token} = await loadFixture(deployFixture);
            expect(await shop.connect(owner).getShopBalance()).to.equal(0);
            await setBalance(shop.address, 1000);
            expect(await shop.connect(owner).getShopBalance()).to.equal(1000);
        })

    })

    describe("WITHDRAW ALL", () => {

        it("only owner", async () => {
            const {owner, seller, buyer, shop, token} = await loadFixture(deployFixture);
            await expect(shop.connect(seller).withdrawAll())
                .to.be.revertedWith("Ownable: caller is not the owner");
            await expect(shop.connect(buyer).withdrawAll())
                .to.be.revertedWith("Ownable: caller is not the owner");
        });

        it("it change ethers balances of shop and owner", async () => {
            const {owner, seller, buyer, shop, token} = await loadFixture(deployFixture);
            const balance = 1000;
            await setBalance(shop.address, balance);
            await expect(shop.connect(owner).withdrawAll())
                .changeEtherBalances([shop, owner], [-balance, +balance]);
        })

    })

})
