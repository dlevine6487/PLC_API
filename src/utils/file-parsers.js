const xml2js = require('xml2js');

async function parsePlcTagTable(content) {
    const parsedXml = await xml2js.parseStringPromise(content, { explicitArray: false, mergeAttrs: true });
    const tagTable = parsedXml.Document?.['SW.Tags.PlcTagTable'];
    if (!tagTable) return null;

    const tagsNode = tagTable.ObjectList?.['SW.Tags.PlcTag'];
    const plcTags = tagsNode ? (Array.isArray(tagsNode) ? tagsNode : [tagsNode]) : [];

    const sourceTags = plcTags.map(t => ({
        name: t.AttributeList.Name,
        fullTagName: `"${t.AttributeList.Name}"`,
        type: t.AttributeList.DataTypeName,
        logicalAddress: t.AttributeList.LogicalAddress,
        isReadOnly: t.AttributeList.Accessibility === 'ReadOnly'
    }));

    return {
        type: 'TagTable',
        sourceName: tagTable.AttributeList.Name || 'Default Tag Table',
        tags: sourceTags.sort((a,b) => a.name.localeCompare(b.name))
    };
}

async function parseGlobalDB(content) {
    const parsedXml = await xml2js.parseStringPromise(content, { explicitArray: false, mergeAttrs: true });
    const dbNode = parsedXml.Document?.['SW.Blocks.GlobalDB'];
    if (!dbNode) return null;

    const dbName = dbNode.AttributeList.Name;
    const membersNode = dbNode.AttributeList.Interface?.Sections?.Section?.Member;
    const members = membersNode ? (Array.isArray(membersNode) ? membersNode : [membersNode]) : [];
    const warnings = [];

    const sourceTags = members.map(m => {
        const isUDT = m.Datatype.startsWith('"');
        if (isUDT) {
            warnings.push(`Skipped UDT "${m.Name}" of type ${m.Datatype} in ${dbName}.`);
        }
        return {
            name: m.Name,
            fullTagName: `"${dbName}"."${m.Name}"`,
            type: m.Datatype.replace(/"/g, ''),
            isReadOnly: false,
            error: isUDT ? 'UDT_NOT_SUPPORTED' : null
        };
    }).filter(t => t);

    return {
        type: 'GlobalDB',
        sourceName: dbName,
        tags: sourceTags.sort((a,b) => a.name.localeCompare(b.name)),
        warnings
    };
}

function parseS7dcl(content) {
    const dbNameMatch = content.match(/DATA_BLOCK\s+"?([^"\s]+)"?/);
    if (!dbNameMatch) return null;
    const dbName = dbNameMatch[1];

    const varBlockMatch = content.match(/VAR([\s\S]*?)END_VAR/);
    if (!varBlockMatch) return { type: 'DataBlock', sourceName: dbName, tags: [] };

    const tags = [];
    const lines = varBlockMatch[1].trim().split('\n');
    for (const line of lines) {
        const declarationMatch = line.match(/^\s*(\w+)\s*:\s*(\w+)\s*;/);
        if (declarationMatch) {
            const [, name, type] = declarationMatch;
            tags.push({
                name,
                fullTagName: `"${dbName}"."${name}"`,
                type,
                isReadOnly: false
            });
        }
    }
    return {
        type: 'DataBlock',
        sourceName: dbName,
        tags: tags.sort((a,b) => a.name.localeCompare(b.name))
    };
}

module.exports = {
    parsePlcTagTable,
    parseGlobalDB,
    parseS7dcl
};
