import {NeedPasswordError} from "../Errors";

const BIP39 = require('bip39');
import {Store} from 'redux';
import {IStore} from 'Core/Declarations/Store';
import {KeyringEvent} from 'Core/Actions/Controller';
import {KeyringAction} from 'Core/Actions/Reducer';
import {IBackgroundCore} from 'Core/Declarations/Service';
import {AbstractController} from 'Background/Service/AbstractController';

import {
    VaultDataInterface,
    SeedVaultProvider,
    InvalidPasswordException,
    generateSeedVault
} from "Core/Service/SeedVault";

const TIMEOUT_30M: number = 1800;
const TIMEOUT_1H: number = 3600;

export class KeyringController extends AbstractController {

    vaultProvider?: SeedVaultProvider;
    private password?: string;
    private timeout;

    public get alias (): string {
        return 'KEYRING';
    }

    public constructor(app: IBackgroundCore, store: Store<IStore>) {
        super(app, store);

        const {Keyring, Global} = this.getState();
        if (Keyring.vault) {
            this.vaultProvider = new SeedVaultProvider(Keyring.vault);
        }

        this.setNeedPassword();

        this.bindEventListener(KeyringEvent.TryPassword, this.onTryPassword);
        this.bindEventListener(KeyringEvent.CheckSeed, this.onCheckSeed);
        this.bindEventListener(KeyringEvent.SetNewPasscode, this.onSetNewPasscode);
    }

    public setNeedPassword() {
        if (!this.isNeedPassword()) {
            this.dispatchStore(KeyringAction.NeedPassword);
        }
    }

    public setHasPassword() {
        if (this.isNeedPassword()) {
            this.dispatchStore(KeyringAction.HasPassword);
        }
    }


    /**
     * @param {any} request
     * @returns {Promise<any>}
     */
    public onTryPassword = (request: any): any => {
        const {passcode} = request;
        this.setPassword(passcode);

        return new Promise<any>((resolve) => {
            setTimeout(() => {
                resolve({
                    type: this.alias,
                    success: true
                });
            }, 5000);
        });
    };


    /**
     * Action
     */
    public onCheckSeed = (request: any): any => {
        const {seed} = request;
        this.checkSeed(seed);

        return {
            type: this.alias,
            success: true
        };
    };


    /**
     * Actions
     */
    public onSetNewPasscode = (request: any): any => {
        const {seed, passcode} = request;

        this.checkSeed(seed);

        this.setVault(generateSeedVault(seed, passcode).getVaultData());
        this.setNeedPassword();

        return {
            type: this.alias,
            success: true
        };
    };


    /**
     * @returns {boolean}
     */
    public isNeedPassword(): boolean {
        return this.getState().Keyring.needPassword;
    }

    /**
     * @param {VaultDataInterface} vaultData - Vault data with encoded Seed, password and seed hashes
     */
    public setVault(vaultData: VaultDataInterface) {
        this.clearPassword();
        this.vaultProvider = new SeedVaultProvider(vaultData);
    }

    /**
     * @param {string[]} seed
     */
    public checkSeed(seed: string[]) {
        if (!this.vaultProvider.isValidSeed(seed)) {
            throw new Error('Seed is not match actual seed');
        }
    }

    /**
     * @param {string} password
     */
    public setPassword(password: string) {
        if (false === this.vaultProvider.isValidPassword(password)) {
            throw new InvalidPasswordException;
        }

        this.password = password;
        this.setHasPassword();
        this.setPasswordTimeout();
    }


    public clearPassword() {
        this.password = null;
        this.setNeedPassword();
        this.clearTimeout();
    }

    /**
     * @param {number} timeout - Value of timeout in second
     */
    public setPasswordTimeout(timeout: number = null) {
        this.clearTimeout();

        let timeoutTime: number = (timeout ? timeout : TIMEOUT_30M) * 1000;
        this.timeout = setTimeout(this.clearPassword.bind(this), timeoutTime);
    }


    public clearTimeout() {
        if (this.timeout) {
            clearTimeout(this.timeout);
        }
    }


    public getSeed(): string[] {
        if (!this.vaultProvider) {
            throw new Error('Set the Vault provider with a vault!')
        }

        if (!this.password) {
            throw new NeedPasswordError('Set vault password!')
        }

        return this.vaultProvider.getSeed(this.password);
    }

    public getBufferSeed(): Buffer {
        return BIP39.mnemonicToSeed(this.getSeed().join(' '));
    }
}
