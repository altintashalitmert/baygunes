import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

// Format currency
const formatMoney = (amount) => {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(amount)
}

// Load Turkish Font (Roboto-Regular)
const addTurkishFont = async (doc) => {
  try {
    const fontUrl = 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.66/fonts/Roboto/Roboto-Regular.ttf'
    const response = await fetch(fontUrl)
    const blob = await response.blob()
    const reader = new FileReader()

    return new Promise((resolve) => {
      reader.onloadend = () => {
        const base64data = reader.result.split(',')[1]
        doc.addFileToVFS('Roboto-Regular.ttf', base64data)
        doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal')
        doc.setFont('Roboto')
        resolve()
      }
      reader.readAsDataURL(blob)
    })
  } catch (error) {
    console.error('Font loading failed:', error)
  }
}

export const generatePDF = {
  // Printing Report (Baskı Emri)
  printingReport: async (orders) => {
    const doc = new jsPDF()
    await addTurkishFont(doc)

    // Title
    doc.setFontSize(18)
    doc.text('BASKI EMRİ RAPORU', 14, 20)
    
    doc.setFontSize(10)
    doc.text(`Tarih: ${new Date().toLocaleDateString('tr-TR')}`, 14, 28)
    doc.text(`Toplam Kayıt: ${orders.length}`, 14, 34)

    // Table
    autoTable(doc, {
      startY: 40,
      styles: { font: 'Roboto', fontStyle: 'normal' },
      head: [['Reklam ID', 'Direk Kodu', 'Müşteri', 'Başlangıç', 'Bitiş', 'Durum']],
      body: orders.map(order => [
        order.id.split('-')[0], // Short ID
        order.pole_code,
        order.client_name,
        new Date(order.start_date).toLocaleDateString('tr-TR'),
        new Date(order.end_date).toLocaleDateString('tr-TR'),
        order.status
      ]),
    })

    doc.save(`baski-emri-${new Date().toISOString().split('T')[0]}.pdf`)
  },

  // Mounting Report (Montaj Emri)
  mountingReport: async (orders) => {
    const doc = new jsPDF()
    await addTurkishFont(doc)

    doc.setFontSize(18)
    doc.text('MONTAJ EMRİ RAPORU', 14, 20)
    
    doc.setFontSize(10)
    doc.text(`Tarih: ${new Date().toLocaleDateString('tr-TR')}`, 14, 28)
    doc.text(`Toplam Kayıt: ${orders.length}`, 14, 34)

    autoTable(doc, {
      startY: 40,
      styles: { font: 'Roboto', fontStyle: 'normal' },
      head: [['Direk Kodu', 'Konum', 'Müşteri', 'Tarih', 'İşlem']],
      body: orders.map(order => [
        order.pole_code,
        order.pole?.address || `${order.pole?.latitude}, ${order.pole?.longitude}`, // Adres yoksa koordinat
        order.client_name,
        new Date(order.start_date).toLocaleDateString('tr-TR'),
        'ASMA' // Sabit
      ]),
    })

    doc.save(`montaj-emri-${new Date().toISOString().split('T')[0]}.pdf`)
  },

  // Financial Report (Hak Ediş)
  financialReport: async (orders, pricing) => {
    const doc = new jsPDF()
    await addTurkishFont(doc)

    doc.setFontSize(18)
    doc.text('HAK EDİŞ VE GELİR RAPORU', 14, 20)
    
    doc.setFontSize(10)
    doc.text(`Tarih: ${new Date().toLocaleDateString('tr-TR')}`, 14, 28)

    // Calculate Totals
    let totalIncome = 0
    const reportData = orders.map(order => {
        // Mock Calc: Assume standard sizes for calculation
        // Real app would use actual dimensions
        const area = 3 // 3m2 standart varsayım
        const printCost = area * (pricing.print_price_sqm?.value || 0)
        const mountCost = pricing.mount_price?.value || 0
        const total = printCost + mountCost
        
        totalIncome += total

        return [
            order.client_name,
            order.pole_code,
            formatMoney(printCost),
            formatMoney(mountCost),
            formatMoney(total)
        ]
    })

    autoTable(doc, {
      startY: 40,
      styles: { font: 'Roboto', fontStyle: 'normal' },
      head: [['Müşteri', 'Direk', 'Baskı Tutarı', 'Montaj Tutarı', 'Toplam']],
      body: reportData,
      foot: [['', '', '', 'GENEL TOPLAM:', formatMoney(totalIncome)]]
    })

    doc.save(`hak-edis-raporu-${new Date().toISOString().split('T')[0]}.pdf`)
  }
}
