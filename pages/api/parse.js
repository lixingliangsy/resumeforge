// pages/api/parse.js
// Note

import formidable from 'formidable'
import pdfParse from 'pdf-parse'
import mammoth from 'mammoth'
import fs from 'fs'

export const config = {
  api: {
    bodyParser: false,
  },
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Note
    const form = formidable({
      multiples: false,
      uploadDir: '/tmp',
      keepExtensions: true,
    })

    const [fields, files] = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err)
        resolve([fields, files])
      })
    })

    const file = files.resume || files.file
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' })
    }

    const filePath = file.filepath || file.path
    const fileName = file.originalFilename || file.newFilename
    const fileExt = fileName.split('.').pop().toLowerCase()

    let text = ''
    let parsedData = null

    // Note
    if (fileExt === 'pdf') {
      const dataBuffer = fs.readFileSync(filePath)
      const pdfData = await pdfParse(dataBuffer)
      text = pdfData.text
      parsedData = parseResumeText(text)
    } else if (fileExt === 'docx' || fileExt === 'doc') {
      const result = await mammoth.extractRawText({ path: filePath })
      text = result.value
      parsedData = parseResumeText(text)
    } else {
      return res.status(400).json({ error: 'Unsupported file format. Please upload PDF or Word document.' })
    }

    // Note
    try {
      fs.unlinkSync(filePath)
    } catch (e) {
      // Note
    }

    res.status(200).json({
      success: true,
      fileName: fileName,
      fileType: fileExt,
      rawText: text,
      parsedData: parsedData,
    })
  } catch (error) {
    console.error('Parse error:', error)
    res.status(500).json({ error: 'Failed to parse resume', details: error.message })
  }
}

// Note
function parseResumeText(text) {
  const data = {
    personalInfo: {
      name: '',
      email: '',
      phone: '',
      location: '',
    },
    summary: '',
    experience: [],
    education: [],
    skills: [],
    projects: [],
    certifications: [],
  }

  // Note
  const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)
  if (emailMatch) {
    data.personalInfo.email = emailMatch[0]
  }

  // Note
  const phoneMatch = text.match(/(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3,4}[-.\s]?\d{4}/)
  if (phoneMatch) {
    data.personalInfo.phone = phoneMatch[0]
  }

  // Note
  const skillKeywords = [
    'JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'C#', 'Go', 'Rust',
    'React', 'Vue', 'Angular', 'Next.js', 'Node.js', 'Express',
    'SQL', 'MySQL', 'PostgreSQL', 'MongoDB', 'Redis',
    'Docker', 'Kubernetes', 'AWS', 'Azure', 'GCP',
    'Git', 'CI/CD', 'Agile', 'Scrum',
    'Machine Learning', 'AI', 'Data Analysis',
  ]

  const foundSkills = []
  skillKeywords.forEach(skill => {
    if (text.includes(skill)) {
      foundSkills.push(skill)
    }
  })
  data.skills = foundSkills

  // Note
  const experiencePattern = /(\d{4}\s*[-–]\s*\d{4}|\d{4}\s*[-–]\s*(Present|Current))/gi
  const experienceMatches = text.match(experiencePattern)
  if (experienceMatches) {
    data.experience = experienceMatches.map((match, index) => ({
      period: match,
      title: '',
      company: '',
      description: '',
    }))
  }

  // Note
  const educationKeywords = ['Bachelor', 'Master', 'PhD', 'Degree', 'University', 'College']
  const educationLines = text.split('\n').filter(line => 
    educationKeywords.some(keyword => line.includes(keyword))
  )
  data.education = educationLines.slice(0, 3).map(line => ({
    degree: line.trim(),
    school: '',
    year: '',
  }))

  // Note
  const summaryMatch = text.match(/(Summary|Profile|About)[:\s]*([\s\S]*?)(?=\n\n|Experience|Education|Skills)/i)
  if (summaryMatch) {
    data.summary = summaryMatch[2].trim().substring(0, 500)
  }

  return data
}
