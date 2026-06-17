const cds = require('@sap/cds')

module.exports = class CatalogService extends cds.ApplicationService {
    async init() {
        const {Books} = this.entities

        const path = require('path')
        const fs = require('fs')

        function loadProperties(locale) {
            const filename = (!locale || locale === 'en')
                ? 'i18n.properties'
                : `i18n_${locale}.properties`

            const filepath = path.join(__dirname, '..', '_i18n', filename)
            console.log('filepath:', filepath)
            if (!fs.existsSync(filepath)) {
                return loadProperties('en')
            }

            const content = fs.readFileSync(filepath, 'utf-8')
            const messages = {}
            content.split('\n').forEach(line => {
                line = line.trim()
                if (!line || line.startsWith('#')) return
                const idx = line.indexOf('=')
                if (idx === -1) return
                messages[line.slice(0, idx).trim()] = line.slice(idx + 1).trim()
            })
            return messages
        }

        this.on('publish',Books,async req => {

            const id = req.params[0].ID 
            const book = await SELECT.one.from(Books).where({ID:id})
            if(!book) return req.error(404,'Book not found')
            
            console.log('Current request language:', req.locale)
            const messages = loadProperties(req.locale)
            
            if(book.stock === 0) {
                return req.error(409, messages['Action_OutOfStock'])
            }

            return { message: `${messages['Action_PublishSuccess']}: <${book.title}>` }
        })

        return super.init()
    }
}