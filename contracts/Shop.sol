// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "./Token.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol";

contract Shop is Ownable, ERC1155Holder {

    //========= STATE =========//
    enum Items {Silver, Gold, Sword, Shield, ThorHammer}
    Token public token;

    uint[] _pricesBuy = [100, 101, 102, 103, 104];
    uint[] _pricesSell = [90, 91, 92, 93, 94];

    uint public test = 111;

    //========= EVENTS =========//
    event PriceBuy(uint tokenId, uint oldValue, uint newValue, uint timestamp);
    event PriceSell(uint tokenId, uint oldValue, uint newValue, uint timestamp);
    event Buy(address buyer, uint tokenId, uint amount, uint price, uint timestamp);
    event BuyBatch(address buyer, uint[] ids, uint[] amounts, uint[] prices, uint timestamp);
    event Sell(address seller, uint tokenId, uint amount, uint price, uint timestamp);
    event SellBatch(address seller, uint[] ids, uint[] amounts, uint[] prices, uint timestamp);
    event Mint(uint tokenId, uint amount, uint timestamp);
    event MintBatch(uint[] ids, uint[] amounts, uint timestamp);
    event Burn(uint tokenId, uint amount, uint timestamp);
    event BurnBatch(uint[] ids, uint[] amounts, uint timestamp);

    //========= CONSTRUCTOR =========//
    constructor() {
        token = new Token();
        token.mint(address(this), uint(Items.Silver), 10 ** 6, "");
        token.mint(address(this), uint(Items.Gold), 10 ** 6, "");
        token.mint(address(this), uint(Items.Shield), 10 ** 3, "");
        token.mint(address(this), uint(Items.Sword), 10 ** 3, "");
        token.mint(address(this), uint(Items.ThorHammer), 10 ** 0, "");
        token.setBaseURI("https://w3s.link/ipfs/bafybeiaxf7knol6sueq26vegx2j3rq4ra3d56k3gfryaqzap6awjyr64em/");
        token.setURI(uint(Items.Silver), "0.json");
        token.setURI(uint(Items.Gold), "1.json");
        token.setURI(uint(Items.Sword), "2.json");
        token.setURI(uint(Items.Shield), "3.json");
        token.setURI(uint(Items.ThorHammer), "4.json");
    }

    //========= GET PRICES BUY =========//
    // get array of prices for buy
    function getPricesBuy() public view returns (uint[] memory) {
        return _pricesBuy;
    }

    //========= SET PRICE BUY =========//
    // set price for buy for token with {tokenId}
    function setPriceBuy(uint tokenId, uint _newPrice) external onlyOwner {
        _requireIdInRange(tokenId);
        require(_newPrice != 0, "Token shop: price could not be equal 0");
        uint oldValue = _pricesBuy[tokenId];
        _pricesBuy[tokenId] = _newPrice;
        emit PriceBuy(tokenId, oldValue, _newPrice, block.timestamp);
    }

    //========= GET PRICES SELL =========//
    // get array of prices for sell
    function getPricesSell() public view returns (uint[] memory) {
        return _pricesSell;
    }

    //========= SET PRICE SELL =========//
    // set price for sell for token with {tokenId}
    function setPriceSell(uint tokenId, uint _newPrice) external onlyOwner {
        _requireIdInRange(tokenId);
        uint oldValue = _pricesSell[tokenId];
        _pricesSell[tokenId] = _newPrice;
        emit PriceSell(tokenId, oldValue, _newPrice, block.timestamp);
    }

    //========= BUY =========//
    function buy(uint tokenId, uint amount) external payable {
        _requireIdInRange(tokenId);

        // amount > 0
        require(amount > 0, "Shop: amount could not be equal 0");

        // buyer sent the required amount of ether
        require(msg.value == _pricesBuy[tokenId] * amount, "Shop: not enough ether");

        // shop have {amount} tokens with {tokenId}
        require(token.balanceOf(address(this), tokenId) >= amount, "Shop: shop doesn't have enough tokens");

        // shop transfer tokens to buyer
        token.safeTransferFrom(address(this), msg.sender, tokenId, amount, "");

        // emit event
        emit Buy(msg.sender, tokenId, amount, _pricesBuy[tokenId], block.timestamp);
    }

    //========= BUY BATCH =========//
    function buyBatch(uint[] calldata ids, uint[] calldata amounts) external payable {
        require(ids.length == amounts.length, "Shop: ids and amounts length mismatch");

        uint cost;
        uint[] memory prices = new uint[](ids.length);

        for (uint i = 0; i < ids.length; i++) {
            _requireIdInRange(ids[i]);
            // amount > 0
            require(amounts[i] > 0, "Shop: amount could not be equal 0");
            // shop have {amount} tokens with {tokenId}
            require(token.balanceOf(address(this), ids[i]) >= amounts[i], "Shop: shop doesn't have enough tokens");
            cost = cost + _pricesBuy[ids[i]] * amounts[i];
            prices[i] = _pricesBuy[ids[i]];
        }

        // buyer sent the required amount of ether
        require(msg.value == cost, "Shop: not enough ether");

        // shop batch transfer tokens to buyer
        token.safeBatchTransferFrom(address(this), msg.sender, ids, amounts, "");

        // emit event
        emit BuyBatch(msg.sender, ids, amounts, prices, block.timestamp);
    }

    //========= SELL =========//
    function sell(uint tokenId, uint amount) external {
        _requireIdInRange(tokenId);

        // amount > 0
        require(amount > 0, "Shop: amount could not be equal 0");

        // seller have {amount} of token {tokenId}
        require(token.balanceOf(msg.sender, tokenId) >= amount, "Shop: seller doesn't have enough tokens");

        // shop is operator for seller
        require(token.isApprovedForAll(msg.sender, address(this)), "Shop: shop is not operator for seller");

        // shop's ether balance is enough for buy tokens from seller
        require(address(this).balance >= _pricesSell[tokenId] * amount, "Shop: shop has not enough ether");

        // transfer tokens from seller to shop
        token.safeTransferFrom(msg.sender, address(this), tokenId, amount, "");

        // send ether from shop to seller
        (bool success,) = msg.sender.call{value : _pricesSell[tokenId] * amount}("");
        require(success, "Shop: transfer ether to seller failed");

        // emit event
        emit Sell(msg.sender, tokenId, amount, _pricesSell[tokenId], block.timestamp);
    }

    //========= SELL BATCH =========//
    function sellBatch(uint[] calldata ids, uint[] calldata amounts) external {
        require(ids.length == amounts.length, "Shop: ids and amounts length mismatch");

        uint cost;
        uint[] memory prices = new uint[](ids.length);

        for (uint i = 0; i < ids.length; i++) {
            _requireIdInRange(ids[i]);
            // amount > 0
            require(amounts[i] > 0, "Shop: amount could not be equal 0");
            // seller have {amount} of token {tokenId}
            require(token.balanceOf(msg.sender, ids[i]) >= amounts[i], "Shop: seller doesn't have enough tokens");
            cost = cost + _pricesSell[ids[i]] * amounts[i];
            prices[i] = _pricesSell[ids[i]];
        }

        // shop is operator for seller
        require(token.isApprovedForAll(msg.sender, address(this)), "Shop: shop is not operator for seller");
        // shop's ether balance is enough for buy tokens from seller
        require(address(this).balance >= cost, "Shop: shop has not enough ether");

        // batch transfer tokens from seller to shop
        token.safeBatchTransferFrom(msg.sender, address(this), ids, amounts, "");

        // send ether from shop to seller
        (bool success,) = msg.sender.call{value : cost}("");
        require(success, "Shop: transfer ether to seller failed");

        // emit event
        emit SellBatch(msg.sender, ids, amounts, prices, block.timestamp);
    }

    //========= MINT TO SHOP =========//
    function mintToShop(uint tokenId, uint amount) external onlyOwner {
        _requireIdInRange(tokenId);
        require(amount > 0, "Shop: amount of minted tokens could not to be equal 0");
        token.mint(address(this), tokenId, amount, "");
        emit Mint(tokenId, amount, block.timestamp);
    }

    //========= MINT BATCH TO SHOP =========//
    function mintBatchToShop(uint[] calldata ids, uint[] calldata amounts) external onlyOwner {
        require(ids.length == amounts.length, "Shop: ids and amounts length mismatch");
        for (uint i = 0; i < ids.length; i++) {
            _requireIdInRange(ids[i]);
            require(amounts[i] > 0, "Shop: amount of minted tokens could not to be equal 0");
        }
        token.mintBatch(address(this), ids, amounts, "");
        emit MintBatch(ids, amounts, block.timestamp);
    }

    //========= BURN FROM SHOP =========//
    function burnFromShop(uint tokenId, uint amount) external onlyOwner {
        _requireIdInRange(tokenId);
        require(amount > 0, "Shop: amount of burned tokens could not to be equal 0");
        token.burn(address(this), tokenId, amount);
        emit Burn(tokenId, amount, block.timestamp);
    }

    //========= BURN BATCH FROM SHOP =========//
    function burnBatchFromShop(uint[] calldata ids, uint[] calldata amounts) external onlyOwner {
        require(ids.length == amounts.length, "Shop: ids and amounts length mismatch");
        for (uint i = 0; i < ids.length; i++) {
            _requireIdInRange(ids[i]);
            require(amounts[i] > 0, "Shop: amount of burned tokens could not to be equal 0");
        }
        token.burnBatch(address(this), ids, amounts);
        emit BurnBatch(ids, amounts, block.timestamp);
    }

    //========= GET SHOP BALANCE =========//
    function getShopBalance() public view onlyOwner returns (uint) {
        return address(this).balance;
    }

    //========= WITHDRAW ALL =========//
    function withdrawAll() public onlyOwner {
        address owner = owner();
        (bool success,) = owner.call{value : address(this).balance}("");
        require(success, "NFTShop: withdrawAll failed");
    }

    //========= _REQUIRE ID IN RANGE =========//
    // generate an error when tokenId is out of range
    function _requireIdInRange(uint tokenId) internal pure {
        require(uint(type(Items).min) <= tokenId && uint(type(Items).max) >= tokenId, "Shop: token id out of range");
    }

}
