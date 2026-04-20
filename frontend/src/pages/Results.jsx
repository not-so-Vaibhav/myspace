import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Award, Printer, Download, ChevronRight, CheckCircle2, FileText, Info } from 'lucide-react';

const Results = () => {
  const { profile } = useAuth();
  const [activeSem, setActiveSem] = useState(3);

  const resultData = {
    1: {
      exam: "Odd Semester End Examinations 2024-2025",
      sem: "First Semester",
      sgpa: "8.27",
      totalCredits: "22",
      cgpa: "8.27",
      status: "First Class with Distinction",
      courses: [
        { code: "23ASH1103", name: "Mathematical Foundations for Computing - I", cr: "3", int: "P", ext: "P", gr: "A", result: "PASS", rmk: "CA" },
        { code: "23CSE1101", name: "Computational Thinking", cr: "2", int: "P", ext: "P", gr: "A+", result: "PASS", rmk: "CA" },
        { code: "23CSE1102R", name: "C Programming", cr: "2", int: "P", ext: "P", gr: "A+", result: "PASS", rmk: "CA" },
        { code: "23ASH1105", name: "Engineering Physics", cr: "3", int: "P", ext: "P", gr: "B+", result: "PASS", rmk: "CA" },
        { code: "23CSE1104", name: "Electrical and Electronics Engineering", cr: "3", int: "P", ext: "P", gr: "A", result: "PASS", rmk: "CA" },
        { code: "23CSE1108", name: "Design Thinking Part - 1", cr: "2", int: "P", ext: "P", gr: "A", result: "PASS", rmk: "CA" },
        { code: "23ASH1108", name: "English Communication for Engineers", cr: "2", int: "P", ext: "-", gr: "A+", result: "PASS", rmk: "CA" },
        { code: "23CSE1107", name: "Computer Engineering Workshop", cr: "1", int: "P", ext: "P", gr: "A+", result: "PASS", rmk: "CA" },
        { code: "23SHD1130", name: "Photography-I", cr: "2", int: "P", ext: "-", gr: "A+", result: "PASS", rmk: "CA" },
        { code: "23SHD1073", name: "Health Practices - I", cr: "2", int: "P", ext: "-", gr: "A", result: "PASS", rmk: "CA" },
      ]
    },
    2: {
      exam: "Even Semester End Examinations 2024-2025",
      sem: "Second Semester",
      sgpa: "8.91",
      totalCredits: "22",
      cgpa: "8.59",
      status: "First Class with Distinction (Promoted)",
      courses: [
        { code: "23ASH1107", name: "Mathematical Foundations for Computing - II", cr: "3", int: "P", ext: "P", gr: "A", result: "PASS", rmk: "CA" },
        { code: "23IT1102", name: "Introduction to Data Structures", cr: "2", int: "P", ext: "P", gr: "A+", result: "PASS", rmk: "CA" },
        { code: "23CSE1103R", name: "C++ Programming", cr: "2", int: "P", ext: "P", gr: "A+", result: "PASS", rmk: "CA" },
        { code: "23ASH1106", name: "Fundamentals of Photonics", cr: "3", int: "P", ext: "P", gr: "B+", result: "PASS", rmk: "CA" },
        { code: "23CSE1105", name: "Digital Electronics and Logic Design", cr: "3", int: "P", ext: "P", gr: "A+", result: "PASS", rmk: "CA" },
        { code: "23SE1109", name: "Design Thinking Part - II", cr: "2", int: "P", ext: "P", gr: "O", result: "PASS", rmk: "CA" },
        { code: "23SHD2003", name: "Professional English Communication for Engineers", cr: "2", int: "P", ext: "-", gr: "O", result: "PASS", rmk: "CA" },
        { code: "23SVS1001", name: "Indian Knowledge System for Engineers", cr: "1", int: "P", ext: "-", gr: "O", result: "PASS", rmk: "CA" },
        { code: "23SHD1074", name: "Health Practices-II", cr: "2", int: "P", ext: "-", gr: "O", result: "PASS", rmk: "CA" },
        { code: "23SHD1131", name: "Photography-II", cr: "2", int: "P", ext: "-", gr: "A+", result: "PASS", rmk: "CA" },
      ]
    },
    3: {
      exam: "Odd Semester End Examinations 2025-2026",
      sem: "Third Semester",
      sgpa: "8.78",
      totalCredits: "23",
      cgpa: "8.66",
      status: "First Class with Distinction",
      courses: [
        { code: "23ASH1109", name: "Mathematical Foundation for Computing - III", cr: "3", int: "P", ext: "P", gr: "A+", result: "PASS", rmk: "CA" },
        { code: "23SE2002", name: "Data Structures and Algorithms", cr: "4", int: "P", ext: "P", gr: "A+", result: "PASS", rmk: "CA" },
        { code: "23SE2003", name: "Software Engineering", cr: "3", int: "P", ext: "P", gr: "A+", result: "PASS", rmk: "CA" },
        { code: "23SE1007", name: "Processor Architecture and Interfacing", cr: "3", int: "P", ext: "P", gr: "A", result: "PASS", rmk: "CA" },
        { code: "23SE2009", name: "Database Management Systems Lab", cr: "1", int: "P", ext: "P", gr: "A", result: "PASS", rmk: "CA" },
        { code: "23SE2004", name: "Database Management Systems", cr: "3", int: "P", ext: "P", gr: "A", result: "PASS", rmk: "CA" },
        { code: "23SE1010", name: "Project Based Learning - 1", cr: "2", int: "P", ext: "-", gr: "A+", result: "PASS", rmk: "CA" },
        { code: "23SE1012", name: "Python Essentials", cr: "2", int: "P", ext: "P", gr: "A+", result: "PASS", rmk: "CA" },
        { code: "23CIV1302", name: "Environmental Studies", cr: "2", int: "P", ext: "-", gr: "O", result: "PASS", rmk: "CA" },
        { code: "23SHD1007", name: "Societal Immersion, Spirituality and Morality - I", cr: "-", int: "P", ext: "-", gr: "A+", result: "PASS", rmk: "CA" },
      ]
    }
  };

  const currentResult = resultData[activeSem];

  return (
    <div className="p-8 sm:p-12 space-y-10 bg-[#fcfdfe] min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start gap-6 print:hidden">
        <div>
          <h1 className="text-3xl font-black text-[#1a1b4b] uppercase tracking-tighter flex items-center gap-3">
            <Award className="text-[#ef4444]" /> Academic Results
          </h1>
          <p className="text-gray-400 font-bold text-xs tracking-widest uppercase mt-1">Grade Cards & Performance Tracking</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => window.print()} className="flex items-center gap-2 px-5 py-2.5 bg-[#1a1b4b] text-white rounded-xl text-[12px] font-black uppercase tracking-widest hover:bg-[#2d3a8c] transition-all shadow-md">
            <Printer size={14} /> Print Result
          </button>
        </div>
      </div>

      {/* Semester Selector */}
      <div className="flex gap-3 print:hidden">
        {[1, 2, 3].map(sem => (
          <button
            key={sem}
            onClick={() => setActiveSem(sem)}
            className={`px-6 py-3 rounded-2xl text-[12px] font-black uppercase tracking-widest transition-all ${
              activeSem === sem 
                ? 'bg-[#1a1b4b] text-white shadow-lg shadow-[#1a1b4b]/20 scale-105' 
                : 'bg-white border border-gray-100 text-gray-400 hover:bg-gray-50'
            }`}
          >
            Semester {sem}
          </button>
        ))}
      </div>

      {/* Grade Card Canvas */}
      <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-xl shadow-[#1a1b4b]/5 overflow-hidden print:shadow-none print:border-none print:rounded-none lg:max-w-5xl mx-auto">
        {/* Certificate Header */}
        <div className="p-10 border-b border-gray-100 text-center space-y-4">
          <h2 className="text-sm font-black text-gray-400 uppercase tracking-[0.3em]">MIT ADT UNIVERSITY</h2>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-[#1a1b4b] uppercase">School of Computing</h3>
            <h4 className="text-3xl font-black text-[#1a1b4b] uppercase tracking-tight">Grade Card</h4>
            <p className="text-xs font-black text-[#ef4444] uppercase tracking-widest">B. Tech. (Computer Science and Engineering)</p>
          </div>
          <div className="inline-block px-4 py-1.5 bg-gray-50 rounded-full border border-gray-100 italic text-[12px] font-bold text-gray-500">
            {currentResult.exam}
          </div>
        </div>

        {/* User Info Grid */}
        <div className="p-10 grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6 border-b border-gray-100 bg-gray-50/30">
          <div className="space-y-4">
            <div className="flex justify-between items-end border-b border-gray-200 pb-1">
              <span className="text-[12px] font-black text-gray-400 uppercase tracking-widest">Student Name</span>
              <span className="text-sm font-black text-[#1a1b4b] uppercase">{profile?.full_name || 'Vaibhav Bariyar'}</span>
            </div>
            <div className="flex justify-between items-end border-b border-gray-200 pb-1">
              <span className="text-[12px] font-black text-gray-400 uppercase tracking-widest">Father's Name</span>
              <span className="text-sm font-black text-[#1a1b4b] uppercase">Vijay Kumar Bariar</span>
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-end border-b border-gray-200 pb-1">
              <span className="text-[12px] font-black text-gray-400 uppercase tracking-widest">Enrolment Number</span>
              <span className="text-sm font-black text-[#1a1b4b] uppercase tracking-widest">ADT24SOCB1338</span>
            </div>
            <div className="flex justify-between items-end border-b border-gray-200 pb-1">
              <span className="text-[12px] font-black text-gray-400 uppercase tracking-widest">Mother's Name</span>
              <span className="text-sm font-black text-[#1a1b4b] uppercase">Sandhya Rani</span>
            </div>
          </div>
        </div>

        {/* Results Table */}
        <div className="p-0 overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-[#1a1b4b]/5">
                <th className="px-6 py-4 text-left text-[12px] font-black text-[#1a1b4b] uppercase tracking-widest border-b border-gray-100">Code</th>
                <th className="px-6 py-4 text-left text-[12px] font-black text-[#1a1b4b] uppercase tracking-widest border-b border-gray-100">Course Name</th>
                <th className="px-2 py-4 text-center text-[12px] font-black text-[#1a1b4b] uppercase tracking-widest border-b border-gray-100">CR</th>
                <th className="px-2 py-4 text-center text-[12px] font-black text-[#1a1b4b] uppercase tracking-widest border-b border-gray-100">INT</th>
                <th className="px-2 py-4 text-center text-[12px] font-black text-[#1a1b4b] uppercase tracking-widest border-b border-gray-100">EXT</th>
                <th className="px-2 py-4 text-center text-[12px] font-black text-[#1a1b4b] uppercase tracking-widest border-b border-gray-100">GR</th>
                <th className="px-4 py-4 text-center text-[12px] font-black text-[#1a1b4b] uppercase tracking-widest border-b border-gray-100">Result</th>
                <th className="px-4 py-4 text-center text-[12px] font-black text-[#1a1b4b] uppercase tracking-widest border-b border-gray-100">Rmk</th>
              </tr>
            </thead>
            <tbody>
              {currentResult.courses.map((course, idx) => (
                <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-3 text-[13px] font-black text-gray-400 tracking-tight">{course.code}</td>
                  <td className="px-6 py-3 text-[13px] font-bold text-[#1a1b4b] truncate max-w-[200px] sm:max-w-none">{course.name}</td>
                  <td className="px-2 py-3 text-[13px] font-black text-[#1a1b4b] text-center">{course.cr}</td>
                  <td className="px-2 py-3 text-[13px] font-black text-gray-400 text-center">{course.int}</td>
                  <td className="px-2 py-3 text-[13px] font-black text-gray-400 text-center">{course.ext}</td>
                  <td className="px-2 py-3 text-[13px] font-black text-emerald-600 text-center">{course.gr}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-block px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded text-[12px] font-black uppercase tracking-widest border border-emerald-100">
                      {course.result}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[13px] font-black text-gray-400 text-center">{course.rmk}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50/80 font-black text-[#1a1b4b] text-xs">
                <td colSpan={2} className="px-6 py-4 uppercase tracking-widest">Semester Performance Summary</td>
                <td className="px-2 py-4 text-center underline font-bold">{currentResult.totalCredits}</td>
                <td colSpan={4} className="px-2 py-4 text-right pr-6 md:pr-12 lg:pr-16 text-[#ef4444] uppercase tracking-widest">SGPA:</td>
                <td className="px-4 py-4 text-center text-xl text-[#1a1b4b]">{currentResult.sgpa}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Cumulative Record & Signatures */}
        <div className="p-10 bg-white flex flex-col md:flex-row gap-10">
          <div className="flex-1 space-y-6">
            <h4 className="text-[12px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
              <div className="w-1 h-3 bg-[#ef4444] rounded-full"></div> Cumulative Record
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-1">
                <p className="text-[12px] font-black text-gray-400 uppercase tracking-widest">Total Credits</p>
                <p className="text-xl font-black text-[#1a1b4b]">{currentResult.totalCredits} / 160</p>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-1">
                <p className="text-[12px] font-black text-gray-400 uppercase tracking-widest">Overall CGPA</p>
                <p className="text-xl font-black text-[#ef4444]">{currentResult.cgpa}</p>
              </div>
            </div>
            <div className="bg-[#1a1b4b] p-5 rounded-2xl flex items-center justify-between shadow-lg shadow-[#1a1b4b]/10">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-500 flex items-center justify-center">
                  <CheckCircle2 className="text-white" size={18} />
                </div>
                <div>
                  <p className="text-[12px] font-black text-white/50 uppercase tracking-widest leading-none">Status</p>
                  <p className="text-sm font-black text-white mt-1 uppercase tracking-tight">{currentResult.status}</p>
                </div>
              </div>
              <ChevronRight className="text-white/20" />
            </div>
          </div>

          <div className="w-full md:w-72 flex flex-col justify-end items-center gap-4 py-4 border-l border-gray-100 border-dashed pl-10 print:border-none print:pl-0">
             <div className="text-center space-y-6 w-full mt-auto">
                <div className="h-20 w-full border-b border-gray-200 italic text-gray-200 flex items-center justify-center text-[12px]">Digital Signature Verified</div>
                <div>
                    <p className="text-[12px] font-black text-[#1a1b4b] uppercase tracking-widest leading-tight">(Dr. Dnyandeo Neelwarna)</p>
                    <p className="text-[12px] font-bold text-gray-400 uppercase tracking-widest">Controller of Examinations</p>
                    <p className="text-[12px] font-bold text-gray-400 mt-4 italic">Date: 16 January 2025</p>
                </div>
             </div>
          </div>
        </div>
        
        {/* Abbreviations */}
        <div className="px-10 py-8 bg-gray-50/50 flex flex-wrap gap-x-8 gap-y-2">
            <div className="flex items-center gap-1.5 text-[12px] font-black text-gray-400 uppercase tracking-wider">
                <div className="w-1 h-1 rounded-full bg-gray-300"></div> Remark CA: Current Attempt
            </div>
            <div className="flex items-center gap-1.5 text-[12px] font-black text-gray-400 uppercase tracking-wider">
                <div className="w-1 h-1 rounded-full bg-gray-300"></div> PP: Past Performance
            </div>
            <div className="flex items-center gap-1.5 text-[12px] font-black text-gray-400 uppercase tracking-wider">
                <div className="w-1 h-1 rounded-full bg-gray-300"></div> GR: Grade
            </div>
             <div className="flex items-center gap-1.5 text-[12px] font-black text-gray-400 uppercase tracking-wider">
                <div className="w-1 h-1 rounded-full bg-gray-300"></div> CR: Credits
            </div>
        </div>
      </div>

      {/* Analytics Insight */}
      <div className="bg-gradient-to-br from-[#1a1b4b] to-[#2d3a8c] p-8 rounded-[2rem] text-white flex flex-col md:flex-row items-center gap-8 shadow-xl shadow-[#1a1b4b]/20 print:hidden">
        <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
            <Award size={32} className="text-[#ef4444]" />
        </div>
        <div className="flex-1 text-center md:text-left">
            <h3 className="text-xl font-black uppercase tracking-tight">Performance Insight</h3>
            <p className="text-sm font-bold text-white/60 mt-1">Your SGPA increased from 8.27 to 8.91 in the second semester. Keep maintaining the high standard!</p>
        </div>
        <button className="px-8 py-3 bg-white text-[#1a1b4b] rounded-xl text-[12px] font-black uppercase tracking-widest hover:bg-gray-100 transition-all shadow-lg active:scale-95">
            View Analytics
        </button>
      </div>
    </div>
  );
};

export default Results;
