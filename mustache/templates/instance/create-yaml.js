const fs = require('fs');
const path = require('path');

const Contracts = require('./contracts');

module.exports = {
  createYaml: (env) => {

    const createInstanceBlock = ({ name, network, startBlocks, address }) => ({
      name,
      network,
      mappingFile: '../src/mapping-instance.ts',
      startBlock: startBlocks.prod,
      address,
      abi: 'Instance',
      entities: ['Deposit', 'Withdrawal'],
      abis: [
        {
          name: 'Instance',
          path: '../abis/Instance.json'
        }
      ],
      events: [
        {
          event: 'Deposit(indexed bytes32,uint32,uint256)',
          handler: 'handleDeposit',
        },
        {
          event: 'Withdrawal(address,bytes32,indexed address,uint256)',
          handler: 'handleWithdrawal',
        }
      ],
    });

    const newLine = '\n';
    const readOnlyComment = `// this is a read only file generated by manual inputs to file mustache/templates/rates/contracts.js.${newLine}`;
    const space = '\xa0';
    const doubleSpace = space + space;
    let contractsToInstancesContent = `${readOnlyComment}export let contractsToInstances = new Map<string, string>();${newLine}`;

    Contracts.forEach(({ address, name, amount, currency }) => {
      if (address != null) {
        contractsToInstancesContent += `contractsToInstances.set(${address.toLowerCase()},${space}//${space}${name}-${currency}-${amount}${newLine}${doubleSpace}"${amount}${'-'}${currency}"${newLine});${newLine}`;
      }
    });

    contractsToInstancesContent += readOnlyComment;
    const targetFile = path.join(__dirname, '../../../src/', 'contractsToInstances.ts');
    fs.writeFileSync(targetFile, contractsToInstancesContent, 'utf8');

    return Contracts.map(({ prod, name, network, address }) => {
      const startBlocks = { prod };
      if (network === env) {
        return createInstanceBlock({ name, startBlocks, network, address })
      }
    }).filter(e => e !== undefined);
  },
};
