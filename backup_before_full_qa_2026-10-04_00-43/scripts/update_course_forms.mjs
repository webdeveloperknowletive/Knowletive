import fs from 'node:fs';

const files = [
  { path: 'src/pages/courses/mern-stack.astro', name: 'MERN Stack Development' },
  { path: 'src/pages/courses/java-full-stack.astro', name: 'Java Full Stack' },
  { path: 'src/pages/courses/cloud-devops.astro', name: 'Cloud & DevOps' },
  { path: 'src/pages/courses/banking.astro', name: 'Banking' },
  { path: 'src/pages/courses/digital-marketing.astro', name: 'Digital Marketing' }
];

for (const { path: fpath, name } of files) {
  let content = fs.readFileSync(fpath, 'utf8');
  if (!content.includes('CourseInquiry')) {
    content = content.replace(
      "import ConsultationCTA from '../../components/ConsultationCTA.astro';",
      "import ConsultationCTA from '../../components/ConsultationCTA.astro';\nimport CourseInquiry from '../../components/CourseInquiry.astro';"
    );
  }
  const formSectionRegex = /<!-- 16\. Inquiry Form -->[\s\S]*?<\/section>/;
  if (formSectionRegex.test(content)) {
    content = content.replace(
      formSectionRegex,
      `<!-- 16. Inquiry Form -->\n  <CourseInquiry courseName="${name}" />`
    );
    fs.writeFileSync(fpath, content, 'utf8');
    console.log('Successfully updated CourseInquiry in:', fpath);
  } else {
    console.warn('Form section not found in:', fpath);
  }
}
