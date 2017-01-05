ledger-dom-js
=============

> A library for parsing files used with ledger, a double-entry accounting system, into a document object model.

This is a library for querying (and eventually writing) the text files used by the [ledger](http://www.ledger-cli.org/), a text-based double-entry accounting system.

This was written in Typescript and includes the `typings` entry in the `package.json`. All of the examples are written in Typescript but can be used with normal Javascript.

This library uses [Big](https://www.npmjs.com/package/big.js) and [Moment](https://www.npmjs.com/package/moment). `Big` is used to ensure that precise numbers and rounding are handled properly.

For a callback approach to working with Ledger files, consider using [ledger-cli](https://www.npmjs.com/package/ledger-cli).

## Setup and usage

Install `ledger-dom` using `npm`:

```sh
npm i ledger-dom
```

## Ledger entities

The system is build around a small series of classes that represent the various components of the `ledger` file.

### Ledger

The top level object, this represents the entire ledger file.

#### commodities

*Commodity[]*

Default: `[]`

An unordered list of commodities within the ledger.

#### accounts

*Account[]*

Default: `[]`

An unordered list of accounts from the file.

#### transactions

*TransactionList*

Default: `[]`

Contains a list of all transactions within the ledger. If the ledger was loaded via `loadFromProcess`, then it will be sorted in date order.

### Account

A class that contains information about an account, such as `Expenses:Advertising`.

#### id

*string*

Contains the internal ID for a given account. This is the key used for account lookups in postings.

#### name

*string*

The name of the account without any path, such as `Advertising` for `Expenses:Advertising`.

#### path

*string*

The full path of the account, such as `Expenses:Advertising`.

#### subaccounts

*Account[]*

Defaults: `[]`

A list of child (or sub) accounts for this one. In the above example, the `Expenses` account would have a child of `Expenses:Advertising`.

### Commodity

A class that represents a commodity.

#### flags

*string*

The internal flags for the commodity.

#### symbol

*string*

The system used for the commodity, such as `$`.

### Transaction

A class that represents a single transaction in the system. A transaction has two or more postings which represents the various accounts associated with the transaction.

#### date

*Moment*

The date of the transaction as a `Moment`.

#### payee

*string*

The name of the payee line.

#### postings

*Posting[]*

Default: `[]`

A list of postings associated with the transaction.

#### hasAccount(regex: RegExp)

Returns: `boolean`

Determines if the transaction has a posting for an account that matches the given regular expression.

### Posting

A line item within a transaction.

#### account

*Account*

The account associated with this posting.

#### quantity

*Big*

A `Big` number that contains the amount of the posting.

#### commodity

*Commodity*

The commodity of the posting. If there is a transaction that modifies two commodities for the same account, there will be two postings for it.

### TransactionList

The `TransactionList` is an intelligent list of transactions that allows for queries to be perform on them and returned as subsets of the given list.

#### transactions

*Transaction[]*

Default: `[]`

A list of all transactions within the list.

#### length

The number of items in `transactions`, effectively `transactions.length`.

#### filterByAccount(regex: RegExp)

Returns: `TransactionList`

Create a new `TransactionList` that only contains transactions that match the regular expression on the transaction's account.

#### filterByDate(start: Moment, end: Moment)

Returns: `TransactionList`

Creates a new `TransactionList` that only contains transactions between the start and end date (as `Moment` objects).

#### get(index: number)

Returns: `Transaction`

Returns the transaction at the given index. This is the same as `transactions[index]`.

#### getTotals()

Returns: `object`

Goes through all the transactions in the list and creates a custom object that has the symbol of each currency along with the total (as a `Big`) for each commodity.

#### push(transaction: Transaction)

Adds a transaction to the list. This is the same as `transactions.push(transaction)`.

## Loading ledgers

There is current no native loading of ledger files into memory. To load a ledger, the library spawns the `ledger` executable and uses that output to create the nested object.

```typescript
import * as ledger from "ledger-dom";

let filename = "ledger.dat";

ledger
    .loadFromProcess(filename)
    .then(data => { console.log(data); });
```

Ledgers can also be loaded from a `Buffer` with the XML output from the `ledger` application or a `Readable` with the same output.

```typescript
ledger.loadFromXmlBuffer(buffer).then(...);
ledger.loadFromXmlReadable(readable).then(...);
```

The `load` methods all return a promise to a `Ledger` object.

## Building

This library uses `npm` for the building.

```shell
npm run build
npm test
```
