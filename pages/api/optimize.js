// pages/api/optimize.js
// Resume optimization suggestions API

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { resumeData, jobDescription } = req.body

    if (!resumeData) {
      return res.status(400).json({ error: 'Missing resume data' })
    }

    // Analyze resume and generate suggestions
    const analysis = analyzeResume(resumeData, jobDescription)

    res.status(200).json({
      success: true,
      analysis: analysis,
    })
  } catch (error) {
    console.error('Optimize error:', error)
    res.status(500).json({ error: 'Failed to analyze resume', details: error.message })
  }
}

// Analyze resume content and generate suggestions
function analyzeResume(resumeData, jobDescription) {
  const suggestions = []
  const keywords = []
  const improvements = []
  let score = 0

  // 1. Check personal info completeness
  if (resumeData.personalInfo) {
    if (!resumeData.personalInfo.name) {
      suggestions.push({
        category: 'Personal info',
        priority: 'high',
        issue: 'Missing name',
        suggestion: 'Add your name at the top of the resume',
      })
    } else {
      score += 10
    }

    if (!resumeData.personalInfo.email) {
      suggestions.push({
        category: 'Personal info',
        priority: 'high',
        issue: 'Missing email',
        suggestion: 'Add your email address',
      })
    } else {
      score += 10
    }

    if (!resumeData.personalInfo.phone) {
      suggestions.push({
        category: 'Personal info',
        priority: 'medium',
        issue: 'Missing phone',
        suggestion: 'Add your phone number',
      })
    } else {
      score += 5
    }
  }

  // 2. Check summary section
  if (!resumeData.summary || resumeData.summary.length < 50) {
    suggestions.push({
      category: 'Summary',
      priority: 'high',
      issue: 'Missing or too-short summary',
      suggestion: 'Add a 2-3 sentence summary highlighting core strengths and career goals',
    })
  } else {
    score += 15
    if (resumeData.summary.length > 200) {
      suggestions.push({
        category: 'Summary',
        priority: 'low',
        issue: 'Summary too long',
        suggestion: 'Keep the summary to 2-3 sentences (~150-200 characters)',
      })
    }
  }

  // 3. Check work experience
  if (!resumeData.experience || resumeData.experience.length === 0) {
    suggestions.push({
      category: 'Experience',
      priority: 'high',
      issue: 'Missing work experience',
      suggestion: 'Add work history: company, title, dates, and key responsibilities',
    })
  } else {
    score += 20
    const expCount = resumeData.experience.length
    if (expCount < 2) {
      suggestions.push({
        category: 'Experience',
        priority: 'medium',
        issue: 'Limited work experience',
        suggestion: 'Consider internships, volunteer work, or projects to enrich experience',
      })
    }

    // Check for quantified achievements
    const hasMetrics = JSON.stringify(resumeData.experience).match(/\d+%|\d+ 人|\d+ 万|\d+ 个/)
    if (!hasMetrics) {
      suggestions.push({
        category: 'Experience',
        priority: 'medium',
        issue: 'Missing quantified results',
        suggestion: 'Add quantified results, e.g. "Increased sales 30%" or "Managed team of 10"',
      })
    } else {
      score += 10
    }
  }

  // 4. Check skills section
  if (!resumeData.skills || resumeData.skills.length === 0) {
    suggestions.push({
      category: 'Skills',
      priority: 'high',
      issue: 'Missing skills list',
      suggestion: 'List professional skills: languages, tools, frameworks, etc.',
    })
  } else {
    score += 15
    if (resumeData.skills.length < 5) {
      suggestions.push({
        category: 'Skills',
        priority: 'medium',
        issue: 'Skills list too short',
        suggestion: 'List 8-12 relevant hard and soft skills',
      })
    } else if (resumeData.skills.length >= 8) {
      score += 5
    }
  }

  // 5. Check education section
  if (!resumeData.education || resumeData.education.length === 0) {
    suggestions.push({
      category: 'Education',
      priority: 'medium',
      issue: 'Missing education',
      suggestion: 'Add education: degree, school, and graduation year',
    })
  } else {
    score += 10
  }

  // 6. Keyword analysis when job description provided
  if (jobDescription) {
    const jobKeywords = extractKeywords(jobDescription)
    const resumeText = JSON.stringify(resumeData).toLowerCase()
    
    const matchedKeywords = jobKeywords.filter(kw => 
      resumeText.includes(kw.toLowerCase())
    )
    const missingKeywords = jobKeywords.filter(kw => 
      !resumeText.includes(kw.toLowerCase())
    )

    keywords.push({
      category: 'Matched keywords',
      keywords: matchedKeywords,
    })
    keywords.push({
      category: 'Missing keywords',
      keywords: missingKeywords.slice(0, 10),
      suggestion: 'Consider adding these keywords to improve ATS match rate',
    })

    score += Math.min(matchedKeywords.length * 2, 15)
  }

  // 7. Format and structure suggestions
  improvements.push({
    category: 'Format',
    suggestions: [
      'Use clear headings and sections',
      'Keep consistent date formatting',
      'Use bullet lists instead of paragraphs',
      'Keep font size consistent (10-12pt body text)',
    ],
  })

  improvements.push({
    category: 'Content',
    suggestions: [
      'Start bullets with action verbs (e.g. built, managed, optimized)',
      'Highlight achievements over duties',
      'Tailor resume content to each role',
      'Remove outdated or irrelevant experience',
    ],
  })

  // Calculate total score (max 100)
  score = Math.min(score, 100)

  return {
    score: score,
    rating: score >= 80 ? 'Excellent' : score >= 60 ? 'Good' : score >= 40 ? 'Fair' : 'Needs work',
    suggestions: suggestions,
    keywords: keywords,
    improvements: improvements,
    atsCompatibility: {
      score: calculateATSCompatibility(resumeData),
      tips: [
        'Use standard fonts (Arial, Calibri, Times New Roman)',
        'Avoid tables, text boxes, or special characters',
        'Use standard section headings (Experience, Education, Skills)',
        'Save as PDF to preserve formatting',
      ],
    },
  }
}

// Extract keywords (simplified)
function extractKeywords(jobDescription) {
  const commonKeywords = [
    'JavaScript', 'TypeScript', 'Python', 'Java', 'React', 'Node.js',
    'SQL', 'AWS', 'Docker', 'Kubernetes', 'Agile', 'Scrum',
    'Leadership', 'Communication', 'Problem Solving', 'Team Work',
    'Project Management', 'Data Analysis', 'Machine Learning',
  ]

  const found = commonKeywords.filter(kw => 
    jobDescription.toLowerCase().includes(kw.toLowerCase())
  )

  return found.length > 0 ? found : commonKeywords.slice(0, 5)
}

// Calculate ATS compatibility score
function calculateATSCompatibility(resumeData) {
  let score = 50 // Base score

  // Has clear section headings
  score += 10

  // Has standard contact info
  if (resumeData.personalInfo && resumeData.personalInfo.email) {
    score += 10
  }

  // Has skills list
  if (resumeData.skills && resumeData.skills.length > 0) {
    score += 10
  }

  // Has work experience
  if (resumeData.experience && resumeData.experience.length > 0) {
    score += 10
  }

  // Has education section
  if (resumeData.education && resumeData.education.length > 0) {
    score += 10
  }

  return Math.min(score, 100)
}
