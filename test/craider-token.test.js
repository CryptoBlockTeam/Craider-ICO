const assertRevert = require("./helpers/assertRevert");
const debug = require("debug")("craider");
const util = require("./util.js");
var BigNumber = require('bignumber.js');

const CraiderToken = artifacts.require("CraiderTokenMock");

const TOTAL_SUPPLY = new BigNumber(1500000000 * (10 ** 18));
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
//Remove the last char from valid address and assign it to SHORT_ADDRESS const
const SHORT_ADDRESS = '0xdb633765ee4ce0745f4582bae8be2b502cee897';

const ONE_TOKEN = new BigNumber(1000000000000000000);
const TEN_THOUSAND_TOKENS = new BigNumber(10000 * ONE_TOKEN);
const THOUSAND_TOKENS = new BigNumber(1000 * ONE_TOKEN);
const HUNDRED_TOKENS = new BigNumber(100 * ONE_TOKEN);
const HUNDRED_AND_ONE_TOKENS = new BigNumber(101 * ONE_TOKEN);
const FIFTY_TOKENS = new BigNumber(50 * ONE_TOKEN);

contract("CraiderToken", function(accounts) {

  before(() => util.measureGas(accounts));
  // after(() => util.measureGas(accounts));

  const eq = assert.equal.bind(assert);
  const owner = accounts[0];
  const acc1 = accounts[1];
  const acc2 = accounts[2];
  const acc3 = accounts[3];

  const gasPrice = 1e11;
  const logEvents= [];
  const pastEvents = [];

  let craider;

  before(async function () {
    craider = await CraiderToken.new();
    let name = await craider.name();
    let symbol = await craider.symbol();
    let decimals = await craider.decimals();
    let version = await craider.version();

    var contractInfo = '';
    contractInfo ="  " + "-".repeat(40);
    contractInfo += "\n  " + "Current date is: " + new Date().toLocaleString("en-US", {timeZone: "UTC"});
    contractInfo += "\n  " + "-".repeat(40);

    contractInfo += "\n  Token Name: " + name
    contractInfo += "     |  Token Symbol: " + symbol
    contractInfo += "\n  Decimals: " + decimals
    contractInfo += "                |  Version: " + version
    contractInfo += "\n  " + "=".repeat(40);

  console.log(contractInfo)
  });

  async function deploy() {
    craider = await CraiderToken.new();

    // transfer ownership
    await craider.setLimits(0, 1000);
    await craider.transferOwnership(owner);
    await craider.claimOwnership({from: owner});

    const eventsWatch  = craider.allEvents();
    eventsWatch .watch((err, res) => {
      if (err) return;
      pastEvents.push(res);
      debug(">>", res.event, res.args);
    });

    logEvents.push(eventsWatch);
  }

  after(function() {
    logEvents.forEach(ev => ev.stopWatching());
  });

  describe("Initial state", function() {
    before(deploy);

    it("should own contract", async function() {
      const ownerAddress = await craider.owner();
      eq(ownerAddress, owner);
    });

    it("total supply", async function() {
          const tokenCount = await craider.totalSupply();
          eq(tokenCount.toNumber(), TOTAL_SUPPLY);
      });
    });

  describe('Balance', function() {
    before(deploy);

    describe('when requested account has tokens', function() {
      it('returns amount of tokens', async function() {
        const balance = await craider.balanceOf(owner);
        eq(balance.toNumber(), TOTAL_SUPPLY);
      })
    });

    describe('when requested account has no tokens', function() {
      it('returns zero tokens', async function() {
        const balance = await craider.balanceOf(acc1);
        eq(balance.toNumber(), 0);
      });
    });
  });

  describe('Transfer', function() {
    before(deploy);

    describe('when the recipient is not the zero address', function () {
      const to = acc2;

      describe('when the sender does not have enough balance', function () {
        const amount = HUNDRED_TOKENS.toNumber();

        it('reverts', async function () {
          await assertRevert(craider.transfer(to, amount, { from: acc1 }));
        });
      });

      describe('when the sender has enough balance', function () {
        const amount = THOUSAND_TOKENS.toNumber();

        it('transfers the requested amount', async function () {
          await craider.transfer(to, amount, { from: owner });

          const senderBalance = await craider.balanceOf(owner);
          eq(senderBalance, TOTAL_SUPPLY.minus(amount).toNumber());

          const recipientBalance = await craider.balanceOf(to);
          eq(recipientBalance, amount);
        });

        it('emits a transfer event', async function () {
          const { logs } = await craider.transfer(to, amount, { from: owner });

          eq(logs.length, 1);
          eq(logs[0].event, 'Transfer');
          eq(logs[0].args.from, owner);
          eq(logs[0].args.to, to);
          assert(logs[0].args.value.eq(amount));
        });
      });
    });

    describe('when the recipient is the zero address', function () {
      const to = ZERO_ADDRESS;

      it('reverts', async function () {
        await assertRevert(craider.transfer(to, THOUSAND_TOKENS.toNumber(), { from: owner }));
      });
    });

    describe('when provide short recipient address', function () {
      const to = SHORT_ADDRESS;

      it('reverts', async function () {
        try {
          await craider.transfer(to, THOUSAND_TOKENS.toNumber(), { from: owner });
        }
        catch (error) {
          assert(error.message.search('assert.fail') >= 0);
        }
      });
    });
  });

  describe('Approve', function () {
    before(deploy);

    describe('when the spender is not the zero address', function () {
      const spender = acc2;

      describe('when the sender has enough balance', function () {
        const amount = HUNDRED_TOKENS.toNumber();

        beforeEach(async function () {
          await craider.approve(spender, 0, { from: owner });
        });

        it('emits an approval event', async function () {
          const { logs } = await craider.approve(spender, amount, { from: owner });

          eq(logs.length, 1);
          eq(logs[0].event, 'Approval');
          eq(logs[0].args.owner, owner);
          eq(logs[0].args.spender, spender);
          assert(logs[0].args.value.eq(amount));
        });

        describe('when there was no approved amount before', function () {
          it('approves the requested amount', async function () {
            await craider.approve(spender, amount, { from: owner });

            const allowance = await craider.allowance(owner, spender);
            eq(allowance, amount);
          });
        });

        describe('when the spender had an approved amount', function () {
          beforeEach(async function () {
            await craider.approve(spender, 1, { from: owner });
          });

          it('declines approval if the preveious one is not consumed', async function () {
            const allowance = await craider.allowance(owner, spender);
            eq(allowance, 1);

            await assertRevert(craider.approve(spender, amount, { from: owner }));
          });
        });
      });

    });

    describe('when the spender is the zero address', function () {
      const amount = HUNDRED_TOKENS.toNumber();
      const spender = ZERO_ADDRESS;

      beforeEach(async function () {
        await craider.approve(spender, 0, { from: owner });
      });

      it('approves the requested amount', async function () {
        await craider.approve(spender, amount, { from: owner });

        const allowance = await craider.allowance(owner, spender);
        eq(allowance, amount);
      });

      it('emits an approval event', async function () {
        const { logs } = await craider.approve(spender, amount, { from: owner });

        eq(logs.length, 1);
        eq(logs[0].event, 'Approval');
        eq(logs[0].args.owner, owner);
        eq(logs[0].args.spender, spender);
        assert(logs[0].args.value.eq(amount));
      });
    });
  });

  describe('Transfer from', function () {
    before(deploy);

    const spender = acc1;

    describe('when the recipient is not the zero address', function () {
      const to = acc2;

      describe('when the spender has enough approved balance', function () {
        beforeEach(async function () {
          await craider.approve(spender, HUNDRED_TOKENS.toNumber(), { from: owner });
        });

        describe('when the owner has enough balance', function () {
          const amount = HUNDRED_TOKENS.toNumber();

          it('transfers the requested amount', async function () {
            await craider.transferFrom(owner, to, amount, { from: spender });

            const senderBalance = await craider.balanceOf(owner);
            eq(senderBalance, TOTAL_SUPPLY.minus(amount).toNumber());

            const recipientBalance = await craider.balanceOf(to);
            eq(recipientBalance, amount);
          });

          it('decreases the spender allowance', async function () {
            await craider.transferFrom(owner, to, amount, { from: spender });

            const allowance = await craider.allowance(owner, spender);
            assert(allowance.eq(0));
          });

          it('emits a transfer event', async function () {
            const { logs } = await craider.transferFrom(owner, to, amount, { from: spender });

            eq(logs.length, 1);
            eq(logs[0].event, 'Transfer');
            eq(logs[0].args.from, owner);
            eq(logs[0].args.to, to);
            assert(logs[0].args.value.eq(amount));
          });
        });

        describe('when the owner does not have enough balance', function () {
          const amount = HUNDRED_AND_ONE_TOKENS.toNumber();

          it('reverts', async function () {
            await assertRevert(craider.transferFrom(owner, to, amount, { from: spender }));
          });
        });
      });

      describe('when the spender does not have enough approved balance', function () {
        beforeEach(async function () {
          await craider.approve(spender, 0, { from: owner });
          await craider.approve(spender, 99, { from: owner });
        });

        describe('when the owner has enough balance', function () {
          const amount = HUNDRED_TOKENS.toNumber();

          it('reverts', async function () {
            await assertRevert(craider.transferFrom(owner, to, amount, { from: spender }));
          });
        });

        describe('when the owner does not have enough balance', function () {
          const amount = HUNDRED_AND_ONE_TOKENS.toNumber();

          it('reverts', async function () {
            await assertRevert(craider.transferFrom(owner, to, amount, { from: spender }));
          });
        });
      });
    });

    describe('when the recipient is the zero address', function () {
      const amount = TEN_THOUSAND_TOKENS.toNumber();
      const to = ZERO_ADDRESS;

      beforeEach(async function () {
        await craider.approve(spender, 0, { from: owner });
        await craider.approve(spender, amount, { from: owner });
      });

      it('reverts', async function () {
        await assertRevert(craider.transferFrom(owner, to, amount, { from: spender }));
      });
    });

    describe('when provide short recipient address', function () {
      const amount = TEN_THOUSAND_TOKENS.toNumber();
      const to = SHORT_ADDRESS;

      beforeEach(async function () {
        await craider.approve(spender, 0, { from: owner });
        await craider.approve(spender, amount, { from: owner });
      });

      it('reverts', async function () {
        try {
          await (craider.transferFrom(owner, to, amount, { from: spender }));
        }
        catch (err) {
          assert(error.message.search('assert.fail') >= 0);
        }
      });
    });
  });

  describe('Claim lost token', function() {
    before(deploy);

    describe('when tokens are transfered to contract\'s address', async function() {
      const amount = HUNDRED_TOKENS.toNumber();

      before(async function() {
        const to = await craider.address;
        await craider.transfer(to, amount, {from: owner});
        const contractBalanceBefore = await craider.balanceOf(craider.address);
        eq(contractBalanceBefore.toNumber(), amount);
      });

      it('should return the tokens to the owner', async function() {
        const to = await craider.address;

        await craider.claimTokens(to, owner);

        const recipientBalance = await craider.balanceOf(owner);
        eq(recipientBalance.toNumber(), TOTAL_SUPPLY.toNumber());
        const contractBalanceAfter = await craider.balanceOf(craider.address);
        eq(contractBalanceAfter.toNumber(), 0);
      });
    });
  });

  describe('Freeze and Unfreeze transfers', function() {
    before(deploy);

    describe('owner should be able to freeze and unfreeze transfers', async function() {
      const amount = THOUSAND_TOKENS.toNumber();
      const to = acc3;

      it('freezes transfers', async function() {
        await craider.freezeTransfers();
      });

      it('attempt to transfer funds fails', async function () {
        await assertRevert(craider.transfer(to, amount, { from: owner }));

        const senderBalance = await craider.balanceOf(owner);
        eq(senderBalance, TOTAL_SUPPLY.toNumber());

        const recipientBalance = await craider.balanceOf(to);
        eq(recipientBalance, 0);
      });

      it('unfreezes transfers', async function () {
        await craider.unfreezeTransfers();
      });

      it('trasnfer passes after unfreeze', async function () {
        await craider.transfer(to, amount, { from: owner });

        const senderBalance = await craider.balanceOf(owner);
        eq(senderBalance, TOTAL_SUPPLY.minus(amount).toNumber());

        const recipientBalance = await craider.balanceOf(to);
        eq(recipientBalance, amount);
      });
    });

    describe('account different than contract owner should not be able to freeze and unfreeze transfers', async function() {
      const nonowner = acc2;

      it('should fail when account different than contract owner attempt to freeze transfers', async function() {
        await assertRevert(craider.freezeTransfers({ from: nonowner }));
      });

      it('contract owner freezes transfers - success', async function () {
        await craider.freezeTransfers();
      });

      it('should fail when account different than contract owner attempt to unfreeze transfers', async function() {
        await assertRevert(craider.unfreezeTransfers({ from: nonowner }));
      });

      it('contract owner unfreezes transfers - success', async function () {
        await craider.freezeTransfers();
      });
    });
  });

  describe('Transfer and Claim Ownership', function() {
    beforeEach(deploy);

    it('should set claim period for the new owner', async function () {
      await craider.transferOwnership(acc2);
      await craider.setLimits(0, 1000);
      let end = await craider.end();
      eq(end, 1000);
      let start = await craider.start();
      eq(start, 0);
    });

    it('should fail to set invalid period for claim', async function () {
      await craider.transferOwnership(acc3);
      await assertRevert(craider.setLimits(1001, 1000));
    });

    it('should change ownership after successful ownership transfer and claim within defined period', async function () {
      await craider.transferOwnership(acc2);
      await craider.setLimits(0, 1000);
      let end = await craider.end();
      eq(end, 1000);
      let start = await craider.start();
      eq(start, 0);
      let pendingOwner = await craider.pendingOwner();
      eq(pendingOwner, acc2);
      await craider.claimOwnership({ from: acc2 });
      let owner = await craider.owner();
      eq(owner, accounts[2]);
    });

    it('should not change ownership when the claim is initiated outside defined claim period', async function () {
      await craider.transferOwnership(acc1);
      await craider.setLimits(10, 20);
      let end = await craider.end();
      eq(end, 20);
      let start = await craider.start();
      eq(start, 10);
      let pendingOwner = await craider.pendingOwner();
      eq(pendingOwner, acc1);
      await assertRevert(craider.claimOwnership({ from: acc1 }));
      let owner = await craider.owner();
      assert.isTrue(owner !== acc1);
    });
  });
});
