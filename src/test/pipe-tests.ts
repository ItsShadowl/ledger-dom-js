"use strict";

import * as path from "path";
let expect = require("expect");
let ledger = require("../index");
let streamifier = require("streamifier");

let inputFiles = path.join(__dirname, "../../src/test");

describe("loading from pipe", function() {
    it("load simple file", function(done) {
        let filename = path.join(inputFiles, "input-001.ledger");

        ledger
            .loadFromProcess(filename)
            .then(l => {
                expect(l.accounts.length).toBe(4);
                expect(l.transactions.length).toBe(1);

                let t = l.transactions.get(0);
                expect(t.payee).toBe("Cheese Delivery");

                done();
            });
    });
});
