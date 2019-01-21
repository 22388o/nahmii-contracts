const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const BN = require('bn.js');
const bnChai = require('bn-chai');
const {Contract, Wallet} = require('ethers');
const {address0} = require('../mocks');
const MockedConfiguration = artifacts.require('MockedConfiguration');
const WalletLocker = artifacts.require('WalletLocker');

chai.use(chaiAsPromised);
chai.use(bnChai(BN));
chai.should();

module.exports = function (glob) {
    describe('WalletLocker', function () {
        let provider;
        let web3Configuration, ethersConfiguration;
        let web3WalletLocker, ethersWalletLocker;

        before(async () => {
            provider = glob.signer_owner.provider;

            web3Configuration = await MockedConfiguration.new(glob.owner);
            ethersConfiguration = new Contract(web3Configuration.address, MockedConfiguration.abi, glob.signer_owner);
        });

        beforeEach(async () => {
            web3WalletLocker = await WalletLocker.new(glob.owner);
            ethersWalletLocker = new Contract(web3WalletLocker.address, WalletLocker.abi, glob.signer_owner);

            await web3WalletLocker.setConfiguration(web3Configuration.address);

            await web3WalletLocker.registerService(glob.user_a, {from: glob.owner});
            await web3WalletLocker.authorizeInitialService(glob.user_a, {from: glob.owner});

            await web3Configuration.setWalletLockTimeout((await provider.getBlockNumber()) + 1, 3600);
        });

        describe('constructor()', () => {
            it('should initialize fields', async () => {
                (await web3WalletLocker.deployer.call()).should.equal(glob.owner);
                (await web3WalletLocker.operator.call()).should.equal(glob.owner);
            });
        });

        describe('isLocked(address)', () => {
            it('should equal value initialized', async () => {
                (await ethersWalletLocker['isLocked(address)'](glob.user_a))
                    .should.be.false;
                // Alternative:
                // (await web3WalletLocker.isLocked.call(glob.user_a))
                //     .should.be.false;
            });
        });

        describe('isLocked(address,address,uint256)', () => {
            it('should equal value initialized', async () => {
                (await ethersWalletLocker['isLocked(address,address,uint256)'](glob.user_a, address0, 0))
                    .should.be.false;
                // Alternative:
                // (await web3WalletLocker.contract.isLocked['address,address,uint256'].call(glob.user_a, address0, 0))
                //     .should.be.false;
            });
        });

        describe('isLocked(address,address,address,uint256)', () => {
            it('should equal value initialized', async () => {
                (await ethersWalletLocker['isLocked(address,address,address,uint256)'](glob.user_a, glob.user_b, address0, 0))
                    .should.be.false;
                // Alternative:
                // (await web3WalletLocker.contract.isLocked['address,address,address,uint256'].call(glob.user_a, glob.user_b, address0, 0))
                //     .should.be.false;
            });
        });

        describe('lockedAmount()', () => {
            it('should equal value initialized', async () => {
                (await ethersWalletLocker.lockedAmount(glob.user_a, glob.user_b, address0, 0))
                    ._bn.should.eq.BN(0);
            });
        });

        describe('lockedIdsCount()', () => {
            it('should equal value initialized', async () => {
                (await ethersWalletLocker.lockedIdsCount(glob.user_a, glob.user_b, address0, 0))
                    ._bn.should.eq.BN(0);
            });
        });

        describe('lockedIdsByIndices()', () => {
            it('should equal value initialized', async () => {
                (await ethersWalletLocker.lockedIdsByIndices(glob.user_a, glob.user_b, address0, 0, 0, 1))
                    .should.be.an('array').that.is.empty;
            });
        });

        describe('lockFungibleByProxy()', () => {
            describe('if called by unregistered service', () => {
                it('should revert', async () => {
                    await web3WalletLocker.lockFungibleByProxy(
                        glob.user_b, glob.user_c, 10, address0, 0, {from: glob.user_b}
                    ).should.be.rejected;
                });
            });

            describe('if called with equal locked and locker wallets', () => {
                it('should revert', async () => {
                    await web3WalletLocker.lockFungibleByProxy(
                        glob.user_b, glob.user_b, 10, address0, 0, {from: glob.user_a}
                    ).should.be.rejected;
                });
            });

            describe('if within operational constraints', () => {
                it('should successfully lock', async () => {
                    const result = await web3WalletLocker.lockFungibleByProxy(
                        glob.user_b, glob.user_c, 10, address0, 0, {from: glob.user_a}
                    );

                    result.logs.should.be.an('array').and.have.lengthOf(1);
                    result.logs[0].event.should.equal('LockFungibleByProxyEvent');

                    (await ethersWalletLocker['isLocked(address)'](glob.user_b))
                        .should.be.true;
                    (await ethersWalletLocker['isLocked(address,address,uint256)'](glob.user_b, address0, 0))
                        .should.be.true;
                    (await ethersWalletLocker['isLocked(address,address,address,uint256)'](glob.user_b, glob.user_c, address0, 0))
                        .should.be.true;
                    (await ethersWalletLocker.lockedAmount(glob.user_b, glob.user_c, address0, 0))
                        ._bn.should.eq.BN(10);
                });
            });
        });

        describe('lockNonFungibleByProxy()', () => {
            describe('if called by unregistered service', () => {
                it('should revert', async () => {
                    await web3WalletLocker.lockNonFungibleByProxy(
                        glob.user_b, glob.user_c, [10, 20, 30], address0, 0, {from: glob.user_b}
                    ).should.be.rejected;
                });
            });

            describe('if called with equal locked and locker wallets', () => {
                it('should revert', async () => {
                    await web3WalletLocker.lockNonFungibleByProxy(
                        glob.user_b, glob.user_b, [10, 20, 30], address0, 0, {from: glob.user_a}
                    ).should.be.rejected;
                });
            });

            describe('if within operational constraints', () => {
                it('should successfully lock', async () => {
                    const result = await web3WalletLocker.lockNonFungibleByProxy(
                        glob.user_b, glob.user_c, [10, 20, 30], address0, 0, {from: glob.user_a}
                    );

                    result.logs.should.be.an('array').and.have.lengthOf(1);
                    result.logs[0].event.should.equal('LockNonFungibleByProxyEvent');

                    (await ethersWalletLocker['isLocked(address)'](glob.user_b))
                        .should.be.true;
                    (await ethersWalletLocker['isLocked(address,address,uint256)'](glob.user_b, address0, 0))
                        .should.be.true;
                    (await ethersWalletLocker['isLocked(address,address,address,uint256)'](glob.user_b, glob.user_c, address0, 0))
                        .should.be.true;
                    (await ethersWalletLocker.lockedIdsCount(glob.user_b, glob.user_c, address0, 0))
                        ._bn.should.eq.BN(3);
                    (await ethersWalletLocker.lockedIdsByIndices(glob.user_b, glob.user_c, address0, 0, 0, 2))
                        .should.be.an('array').that.has.lengthOf(3);
                });
            });
        });

        describe('unlockFungible()', () => {
            describe('if lock has not timed out', () => {
                beforeEach(async () => {
                    await web3WalletLocker.lockFungibleByProxy(
                        glob.user_b, glob.user_c, 10, address0, 0, {from: glob.user_a}
                    );
                });

                it('should revert', async () => {
                    web3WalletLocker.unlockFungible(glob.user_b, glob.user_c, address0, 0)
                        .should.be.rejected;
                });
            });

            describe('if within operational constraints', () => {
                beforeEach(async () => {
                    await web3Configuration.setWalletLockTimeout(
                        (await provider.getBlockNumber()) + 1, 0
                    );

                    await web3WalletLocker.lockFungibleByProxy(
                        glob.user_b, glob.user_c, 10, address0, 0, {from: glob.user_a}
                    );
                });

                it('should successfully unlock', async () => {
                    const result = await web3WalletLocker.unlockFungible(glob.user_b, glob.user_c, address0, 0);

                    result.logs.should.be.an('array').and.have.lengthOf(1);
                    result.logs[0].event.should.equal('UnlockFungibleEvent');

                    (await ethersWalletLocker['isLocked(address)'](glob.user_b))
                        .should.be.false;
                    (await ethersWalletLocker['isLocked(address,address,uint256)'](glob.user_b, address0, 0))
                        .should.be.false;
                    (await ethersWalletLocker['isLocked(address,address,address,uint256)'](glob.user_b, glob.user_c, address0, 0))
                        .should.be.false;
                    (await ethersWalletLocker.lockedAmount(glob.user_b, glob.user_c, address0, 0))
                        ._bn.should.eq.BN(0);
                });
            });
        });

        describe('unlockFungibleByProxy()', () => {
            describe('if called by unregistered service', () => {
                it('should revert', async () => {
                    web3WalletLocker.unlockFungibleByProxy(glob.user_b, glob.user_c, address0, 0, {from: glob.user_b})
                        .should.be.rejected;
                });
            });

            describe('if within operational constraints', () => {
                beforeEach(async () => {
                    await web3Configuration.setWalletLockTimeout(
                        (await provider.getBlockNumber()) + 1, 0
                    );

                    await web3WalletLocker.lockFungibleByProxy(
                        glob.user_b, glob.user_c, 10, address0, 0, {from: glob.user_a}
                    );
                });

                it('should successfully unlock', async () => {
                    const result = await web3WalletLocker.unlockFungibleByProxy(glob.user_b, glob.user_c, address0, 0, {from: glob.user_a});

                    result.logs.should.be.an('array').and.have.lengthOf(1);
                    result.logs[0].event.should.equal('UnlockFungibleByProxyEvent');

                    (await ethersWalletLocker['isLocked(address)'](glob.user_b))
                        .should.be.false;
                    (await ethersWalletLocker['isLocked(address,address,uint256)'](glob.user_b, address0, 0))
                        .should.be.false;
                    (await ethersWalletLocker['isLocked(address,address,address,uint256)'](glob.user_b, glob.user_c, address0, 0))
                        .should.be.false;
                    (await ethersWalletLocker.lockedAmount(glob.user_b, glob.user_c, address0, 0))
                        ._bn.should.eq.BN(0);
                });
            });
        });

        describe('unlockNonFungible()', () => {
            describe('if lock has not timed out', () => {
                beforeEach(async () => {
                    await web3WalletLocker.lockNonFungibleByProxy(
                        glob.user_b, glob.user_c, [10, 20, 30], address0, 0, {from: glob.user_a}
                    );
                });

                it('should revert', async () => {
                    web3WalletLocker.unlockNonFungible(glob.user_b, glob.user_c, address0, 0)
                        .should.be.rejected;
                });
            });

            describe('if within operational constraints', () => {
                beforeEach(async () => {
                    await web3Configuration.setWalletLockTimeout(
                        (await provider.getBlockNumber()) + 1, 0
                    );

                    await web3WalletLocker.lockNonFungibleByProxy(
                        glob.user_b, glob.user_c, [10, 20, 30], address0, 0, {from: glob.user_a}
                    );
                });

                it('should successfully unlock', async () => {
                    const result = await web3WalletLocker.unlockNonFungible(glob.user_b, glob.user_c, address0, 0);

                    result.logs.should.be.an('array').and.have.lengthOf(1);
                    result.logs[0].event.should.equal('UnlockNonFungibleEvent');

                    (await ethersWalletLocker['isLocked(address)'](glob.user_b))
                        .should.be.false;
                    (await ethersWalletLocker['isLocked(address,address,uint256)'](glob.user_b, address0, 0))
                        .should.be.false;
                    (await ethersWalletLocker['isLocked(address,address,address,uint256)'](glob.user_b, glob.user_c, address0, 0))
                        .should.be.false;
                    (await ethersWalletLocker.lockedIdsCount(glob.user_b, glob.user_c, address0, 0))
                        ._bn.should.eq.BN(0);
                    (await ethersWalletLocker.lockedIdsByIndices(glob.user_b, glob.user_c, address0, 0, 0, 2))
                        .should.be.an('array').that.is.empty;
                });
            });
        });

        describe('unlockNonFungibleByProxy()', () => {
            describe('if called by unregistered service', () => {
                it('should revert', async () => {
                    web3WalletLocker.unlockNonFungibleByProxy(glob.user_b, glob.user_c, address0, 0, {from: glob.user_b})
                        .should.be.rejected;
                });
            });

            describe('if within operational constraints', () => {
                beforeEach(async () => {
                    await web3Configuration.setWalletLockTimeout(
                        (await provider.getBlockNumber()) + 1, 0
                    );

                    await web3WalletLocker.lockNonFungibleByProxy(
                        glob.user_b, glob.user_c, [10, 20, 30], address0, 0, {from: glob.user_a}
                    );
                });

                it('should successfully unlock', async () => {
                    const result = await web3WalletLocker.unlockNonFungibleByProxy(glob.user_b, glob.user_c, address0, 0, {from: glob.user_a});

                    result.logs.should.be.an('array').and.have.lengthOf(1);
                    result.logs[0].event.should.equal('UnlockNonFungibleByProxyEvent');

                    (await ethersWalletLocker['isLocked(address)'](glob.user_b))
                        .should.be.false;
                    (await ethersWalletLocker['isLocked(address,address,uint256)'](glob.user_b, address0, 0))
                        .should.be.false;
                    (await ethersWalletLocker['isLocked(address,address,address,uint256)'](glob.user_b, glob.user_c, address0, 0))
                        .should.be.false;
                    (await ethersWalletLocker.lockedIdsCount(glob.user_b, glob.user_c, address0, 0))
                        ._bn.should.eq.BN(0);
                    (await ethersWalletLocker.lockedIdsByIndices(glob.user_b, glob.user_c, address0, 0, 0, 2))
                        .should.be.an('array').that.is.empty;
                });
            });
        });
    });
};
