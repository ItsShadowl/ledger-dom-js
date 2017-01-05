import * as child from "child_process";
import * as fs from "fs";
import * as stream from "stream";
import * as Big from "big.js";
import * as Promise from "bluebird";
const spawn = require("child-process-promise").spawn;
const moment = require("moment");
const streamifier = require("streamifier");
const XmlStream = require("xml-stream");

/**
* A single line item inside a transaction.
*/
export class Posting {
    account: Account;
    quantity: any;
    commodity: Commodity;
}

export class Transaction {
    date: any;
    payee: string;
    postings: Posting[] = [];

    public hasAccount(regex: RegExp): boolean {
        for (let p of this.postings) {
            if (p.account.path.match(regex)) {
                return true;
            }
        }

        return false;
    }
}

export class TransactionList {
    constructor(ledger: Ledger, transactions: Transaction[] = []) {
        this.ledger = ledger;
        this.transactions = transactions;
    }

    ledger: Ledger;
    transactions: Transaction[] = [];

    get length(): number { return this.transactions.length; }

    public filterByAccount(regex: RegExp): TransactionList {
        let list: Transaction[] = [];

        for (let t of this.transactions) {
            let include = t.hasAccount(regex);
            if (include) {
                list.push(t);
            }
        }

        return new TransactionList(this.ledger, list);
    }

    public filterByDate(start, end): TransactionList {
        let list: Transaction[] = [];

        for (let t of this.transactions) {
            if (start <= t.date && t.date < end) {
                list.push(t);
            }
        }

        return new TransactionList(this.ledger, list);
    }

    public get(index: number): Transaction {
        return this.transactions[index];
    }

    public getTotals(): any {
        // Create a totals obect with all the commodities in it.
        let totals = {};

        for (let c of this.ledger.commodities) {
            totals[c.symbol] = Big(0);
        }

        // Go through the transactions and add up the values.
        for (let t of this.transactions) {
            for (let p of t.postings) {
                let sym = p.commodity.symbol;
                totals[sym] = totals[sym].plus(p.quantity);
            }
        }

        return totals;
    }

    public push(transaction: Transaction): void {
        this.transactions.push(transaction);
    }
}

export class Account {
    id: string;
    name: string;
    path: string;
    subaccounts: Account[] = [];
}

export class Commodity {
    flags: string;
    symbol: string;
}

export class Ledger {
    constructor() {
        this.transactions = new TransactionList(this);
    }

    version: string;
    commodities: Commodity[] = [];
    accounts: Account[]= [];
    transactions: TransactionList;
}

/**
* Loads the contents of the given ledger file and creates
* first-class objects representing the contents.
*/
export function loadFromProcess(filename: string): Promise<Ledger> {
    return new Promise<Buffer>((resolve, reject) => {
        let promise = spawn(
            "ledger",
            [
                "xml",
                "-f", filename,
                "--sort", "date"
            ],
            { stdio: "pipe" });

        let childProcess = promise.childProcess;
        childProcess.stdout.on("data", data => resolve(data));
    })
    .then(loadFromXmlBuffer);
}

export function loadFromXmlBuffer(buffer: Buffer): Promise<Ledger> {
    let readable = streamifier.createReadStream(buffer);
    return loadFromXmlReadable(readable);
}

export function loadFromXmlReadable(input: stream.Readable): Promise<Ledger> {
    return new Promise<Ledger>((resolve, reject) => {
        let xml = new XmlStream(input);

        xml.collect("commodity");
        xml.collect("account");
        xml.collect("transaction");
        xml.collect("posting");

        xml.on("endElement: ledger", function(data) {
            let ledger = parseLedger(data);
            resolve(ledger);
        });
    });
}

function parseLedger(data): Ledger {
    let result = new Ledger();

    result.version = data["$"].version;

    for (let c of data.commodities.commodity) {
        let commodity = parseCommodity(c);
        result.commodities.push(commodity);
    }

    for (let a of data.accounts.account) {
        let account = addAccount(result, a);
    }

    for (let t of data.transactions.transaction) {
        let transaction = parseTransaction(result, t);
        result.transactions.push(transaction);
    }

    return result;
}

function parsePosting(ledger: Ledger, data): Posting {
    let result = new Posting();
    let accountId = data.account[0]["$"].ref;
    let account = ledger.accounts.filter(a => a.id === accountId)[0];
    let symbol = data["post-amount"].amount.commodity[0].symbol;
    let commodity = ledger.commodities.filter(c => c.symbol === symbol)[0];

    result.account = account;
    result.quantity = Big(data["post-amount"].amount.quantity);
    result.commodity = commodity;

    return result;
}

function parseTransaction(ledger: Ledger, data): Transaction {
    let result = new Transaction();

    result.date = moment(data.date, "YYYY/MM/DD");
    result.payee = data.payee;

    for (let t of data.postings.posting) {
        let posting = parsePosting(ledger, t);
        result.postings.push(posting);
    }

    return result;
}

function addAccount(ledger: Ledger, data): Account {
    let result = new Account();

    result.id = data["$"].id;
    result.name = data.name;
    result.path = data.fullname;

    if (result.name) {
        ledger.accounts.push(result);
    }

    if (data.account) {
        for (let child of data.account) {
            let a = addAccount(ledger, child);
            result.subaccounts.push(a);
        }
    }

    return result;
}

function parseCommodity(data): Commodity {
    let result = new Commodity();

    result.flags = data["$"].flags;
    result.symbol = data.symbol;

    return result;
}
