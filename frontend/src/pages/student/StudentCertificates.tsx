import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Award, Calendar, Download, Share2, CheckCircle, Eye, AlertCircle, FileText, CheckSquare, Sparkles, RefreshCw, Trophy, XCircle } from 'lucide-react';
import { Layout } from '../../components/layout/Layout';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/shared/EmptyState';
import { certificateService } from '../../services/certificate.service';
import type { Certificate } from '../../services/certificate.service';
import { studentService } from '../../services/student.service';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export const StudentCertificates: React.FC = () => {
  const navigate = useNavigate();
  const [certs, setCerts] = useState<Certificate[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [previewCert, setPreviewCert] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [activeSubject, setActiveSubject] = useState<string>('');
  const certificateRef = useRef<HTMLDivElement>(null);

  const fetchProgressAndCertificates = async () => {
    setLoading(true);
    try {
      const [certsData, assignmentsRes] = await Promise.all([
        certificateService.getMyCertificates(),
        studentService.getAssignments({ page: '1', limit: '1000' })
      ]);
      setCerts(certsData);
      
      const rawAssignments = assignmentsRes.assignments || [];
      setAssignments(rawAssignments);

      // Select first subject by default
      if (rawAssignments.length > 0) {
        const subjects = Array.from(new Set(rawAssignments.map((a: any) => (a.subject as string) || 'General')));
        if (subjects.length > 0) {
          setActiveSubject(subjects[0] as string);
        }
      }
    } catch (err) {
      toast.error('Failed to load progress data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProgressAndCertificates();
  }, []);

  // Group tasks by subject
  const subjectsMap = new Map<string, any[]>();
  assignments.forEach(a => {
    const sub = a.subject || 'General';
    if (!subjectsMap.has(sub)) {
      subjectsMap.set(sub, []);
    }
    subjectsMap.get(sub)!.push(a);
  });
  const subjectNames = Array.from(subjectsMap.keys());

  // Get active subject tasks and configuration
  const subjectTasks = activeSubject ? (subjectsMap.get(activeSubject) || []) : [];
  
  const configStr = localStorage.getItem(`lms_cert_config_${activeSubject}`);
  const config = configStr ? JSON.parse(configStr) : {
    assignmentPassingMarksPct: 40,
    quizPassingMarksPct: 40,
    minCertificateMarksPct: 75,
    requiredAssignmentCompletionPct: 100,
    requiredQuizCompletionPct: 100,
  };

  const assignmentsList = subjectTasks.filter(a => a.assignmentType !== 'QUIZ');
  const quizzesList = subjectTasks.filter(a => a.assignmentType === 'QUIZ');

  // Stats calculation
  const totalAssignments = assignmentsList.length;
  const submittedAssignments = assignmentsList.filter(a => a.submissionStatus === 'submitted' || a.submissionStatus === 'reviewed').length;
  const pendingAssignments = totalAssignments - submittedAssignments;
  const earnedAssignmentMarks = assignmentsList.reduce((sum, a) => sum + (a.submission?.marks || 0), 0);
  const maxAssignmentMarks = assignmentsList.reduce((sum, a) => sum + (a.maxMarks || 0), 0);
  const assignmentPercentage = maxAssignmentMarks > 0 ? Math.round((earnedAssignmentMarks / maxAssignmentMarks) * 100) : 0;

  const totalQuizzes = quizzesList.length;
  const completedQuizzes = quizzesList.filter(q => q.submissionStatus === 'submitted' || q.submissionStatus === 'reviewed').length;
  const remainingQuizzes = totalQuizzes - completedQuizzes;
  const earnedQuizMarks = quizzesList.reduce((sum, q) => sum + (q.submission?.marks || 0), 0);
  const maxQuizMarks = quizzesList.reduce((sum, q) => sum + (q.maxMarks || 0), 0);
  const quizPercentage = maxQuizMarks > 0 ? Math.round((earnedQuizMarks / maxQuizMarks) * 100) : 0;

  // Overall Score
  let overallPercentage = 0;
  if (totalAssignments > 0 && totalQuizzes > 0) {
    overallPercentage = Math.round((assignmentPercentage + quizPercentage) / 2);
  } else if (totalAssignments > 0) {
    overallPercentage = assignmentPercentage;
  } else if (totalQuizzes > 0) {
    overallPercentage = quizPercentage;
  }

  // Course Passing Check
  const assignmentCompletionRate = totalAssignments > 0 ? (submittedAssignments / totalAssignments) * 100 : 100;
  const quizCompletionRate = totalQuizzes > 0 ? (completedQuizzes / totalQuizzes) * 100 : 100;

  // Helper to parse individual task certificate eligibility marks percentage
  const parseTaskCertEligibility = (instructionsStr: string = '') => {
    if (instructionsStr && instructionsStr.trim().startsWith('{')) {
      try {
        const meta = JSON.parse(instructionsStr);
        return meta.certEligibilityMarks !== undefined ? Number(meta.certEligibilityMarks) : 75;
      } catch {}
    } else if (instructionsStr) {
      const match = instructionsStr.match(/\[CERT_ELIGIBILITY:(\d+)\]/);
      if (match) {
        return Number(match[1]);
      }
    }
    return 75;
  };

  // Course Passing Check
  const failedPassingTasks = subjectTasks.filter(t => {
    const completed = t.submissionStatus === 'submitted' || t.submissionStatus === 'reviewed';
    if (!completed) return true; // not submitted is counted as failed passing
    const score = t.submission?.marks || 0;
    const minPassing = t.passingMarks !== undefined ? t.passingMarks : Math.round(t.maxMarks * 0.4);
    return score < minPassing;
  });

  const allPassingMarksMet = failedPassingTasks.length === 0;
  
  // Basic Course Passing: Meets completion requirements and passes all tasks
  const isCoursePassed = 
    assignmentCompletionRate >= config.requiredAssignmentCompletionPct &&
    quizCompletionRate >= config.requiredQuizCompletionPct &&
    allPassingMarksMet &&
    subjectTasks.length > 0;

  // Certificate Eligibility: 
  // 1. Course is passed
  // 2. All required assignments and quizzes are completed (100% completion rate!)
  const allTasksCompleted = subjectTasks.every(t => t.submissionStatus === 'submitted' || t.submissionStatus === 'reviewed');

  // 3. Score meets or exceeds task-specific Certificate Eligibility Marks
  const failedCertEligibilityTasks = subjectTasks.filter(t => {
    const completed = t.submissionStatus === 'submitted' || t.submissionStatus === 'reviewed';
    if (!completed) return true; // incomplete counts as failed eligibility
    const score = t.submission?.marks || 0;
    const certPct = parseTaskCertEligibility(t.instructions);
    const minCertMarks = t.maxMarks * (certPct / 100);
    return score < minCertMarks;
  });

  // Eligibility binds to final activity
  const getFinalActivityId = () => {
    if (subjectTasks.length === 0) return null;
    const quizzes = subjectTasks.filter(a => a.assignmentType === 'QUIZ');
    if (quizzes.length > 0) {
      const sorted = [...quizzes].sort((a, b) => Number(b.id) - Number(a.id));
      return sorted[0].id;
    }
    const sorted = [...subjectTasks].sort((a, b) => Number(b.id) - Number(a.id));
    return sorted[0].id;
  };

  const finalActivityId = getFinalActivityId();
  const courseCert = certs.find(c => String(c.quizId || c.assignmentId) === String(finalActivityId));

  const isCertEligible = isCoursePassed && allTasksCompleted && failedCertEligibilityTasks.length === 0;

  useEffect(() => {
    if (isCertEligible && finalActivityId && !courseCert) {
      certificateService.getCertificatePreview(finalActivityId)
        .then(data => setPreviewCert(data))
        .catch(err => console.error("Error loading preview certificate metadata", err));
    } else {
      setPreviewCert(null);
    }
  }, [isCertEligible, finalActivityId, courseCert, activeSubject]);

  const handleDownload = async () => {
    if (!finalActivityId || !certificateRef.current) return;
    setDownloading(true);
    const loadingToast = toast.loading('Generating and downloading your certificate...');
    try {
      const element = certificateRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#faf5ed'
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`certificate-${finalActivityId}.pdf`);

      toast.success('Certificate downloaded successfully!', { id: loadingToast });
      await fetchProgressAndCertificates();
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to generate and download certificate', { id: loadingToast });
    } finally {
      setDownloading(false);
    }
  };

  const handleShare = (cert: Certificate) => {
    const frontendUrl = window.location.origin;
    const verificationUrl = `${frontendUrl}/verify-certificate/${cert.verificationToken}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(verificationUrl);
      toast.success('Verification link copied to clipboard!');
    } else {
      toast.error('Sharing not supported on this browser');
    }
  };

  const currentCert = courseCert || previewCert;
  const userStr = localStorage.getItem('lms_user');
  const user = userStr ? JSON.parse(userStr) : null;
  const courseName = activeSubject;
  const studentName = user?.name || currentCert?.studentName || "Student";
  const displayDate = currentCert?.completionDate 
    ? new Date(currentCert.completionDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <Layout role="student" title="Certificates" subtitle="Track your course requirements and view completion certificates">
      {/* Subject Tabs */}
      {subjectNames.length > 1 && (
        <div className="flex border-b border-[var(--brand-border)] mb-6 select-none overflow-x-auto">
          {subjectNames.map(name => (
            <button
              key={name}
              onClick={() => setActiveSubject(name)}
              className={`px-4 py-2.5 text-sm font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                activeSubject === name
                  ? 'border-[#4A1F4F] text-[#4A1F4F]'
                  : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {name}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <Card className="p-10 border border-[var(--brand-border)] animate-pulse flex flex-col items-center justify-center gap-4 min-h-[300px]">
          <RefreshCw className="animate-spin text-[#4A1F4F]" size={36} />
          <span className="text-sm font-semibold text-[var(--text-secondary)]">Calculating course completion requirements...</span>
        </Card>
      ) : subjectNames.length === 0 ? (
        <Card className="py-16 text-center border border-[var(--brand-border)]">
          <EmptyState
            icon="award"
            title="No courses found"
            description="You are not enrolled in any courses with published assignments or quizzes."
          />
        </Card>
      ) : (
        <>
          {/* Top Progress Widgets */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8 select-none">
            {/* Assignment Progress Card */}
            <Card className="p-5 border border-[var(--brand-border)] flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-3">
                  <span className="text-xs uppercase font-extrabold text-[var(--text-secondary)]">Assignments</span>
                  <FileText size={18} className="text-[#4A1F4F]" />
                </div>
                <h3 className="text-2xl font-black text-[var(--text-primary)]">
                  {submittedAssignments} <span className="text-xs font-normal text-[var(--text-secondary)]">/ {totalAssignments} submitted</span>
                </h3>
                <p className="text-[11px] text-[var(--text-secondary)] mt-1">
                  Marks Secured: <span className="font-semibold text-[var(--text-primary)]">{earnedAssignmentMarks.toFixed(1)} / {maxAssignmentMarks.toFixed(1)}</span>
                </p>
              </div>
              <div className="mt-4">
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span className="text-[var(--text-secondary)]">Percentage</span>
                  <span className="text-[#4A1F4F]">{assignmentPercentage}%</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-[#4A1F4F] h-full rounded-full transition-all duration-500" 
                    style={{ width: `${assignmentPercentage}%` }}
                  />
                </div>
              </div>
            </Card>

            {/* Quiz Progress Card */}
            <Card className="p-5 border border-[var(--brand-border)] flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-3">
                  <span className="text-xs uppercase font-extrabold text-[var(--text-secondary)]">Quizzes</span>
                  <Award size={18} className="text-emerald-500" />
                </div>
                <h3 className="text-2xl font-black text-[var(--text-primary)]">
                  {completedQuizzes} <span className="text-xs font-normal text-[var(--text-secondary)]">/ {totalQuizzes} completed</span>
                </h3>
                <p className="text-[11px] text-[var(--text-secondary)] mt-1">
                  Score Secured: <span className="font-semibold text-[var(--text-primary)]">{earnedQuizMarks.toFixed(1)} / {maxQuizMarks.toFixed(1)}</span>
                </p>
              </div>
              <div className="mt-4">
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span className="text-[var(--text-secondary)]">Percentage</span>
                  <span className="text-emerald-500">{quizPercentage}%</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
                    style={{ width: `${quizPercentage}%` }}
                  />
                </div>
              </div>
            </Card>

            {/* Status Overview Card */}
            <Card className="p-5 border border-[var(--brand-border)] flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-3">
                  <span className="text-xs uppercase font-extrabold text-[var(--text-secondary)]">Overall Score</span>
                  <Trophy size={18} className="text-amber-500" />
                </div>
                <h3 className="text-2xl font-black text-[var(--text-primary)]">
                  {overallPercentage}%
                </h3>
                <div className="mt-2 flex flex-col gap-1.5">
                  <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
                    <span className="font-bold">Course Status:</span>
                    {isCoursePassed ? (
                      <span className="font-black text-emerald-600 dark:text-emerald-400">PASSED</span>
                    ) : (
                      <span className="font-black text-rose-600 dark:text-rose-400">FAILED</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
                    <span className="font-bold">Certificate Status:</span>
                    {courseCert ? (
                      <span className="text-[9px] uppercase font-black px-1.5 py-0.5 rounded bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">Generated</span>
                    ) : isCertEligible ? (
                      <span className="text-[9px] uppercase font-black px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">Eligible</span>
                    ) : (
                      <span className="text-[9px] uppercase font-black px-1.5 py-0.5 rounded bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400">Not Eligible</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="mt-4">
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-amber-500 h-full rounded-full transition-all duration-500" 
                    style={{ width: `${overallPercentage}%` }}
                  />
                </div>
              </div>
            </Card>
          </div>

          {/* Main Section */}
          {courseCert || isCertEligible ? (
            /* Eligible / Generated View */
            <div className="space-y-6">
              <Card className="p-6 border-l-4 border-emerald-500 bg-emerald-500/5 dark:bg-emerald-500/10 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-emerald-500/15 flex items-center justify-center text-emerald-600 shrink-0">
                  <Sparkles size={24} className="animate-pulse" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-800 dark:text-slate-100">Congratulations!</h2>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
                    You have successfully completed the course and your certificate has been generated.
                  </p>
                </div>
                <div className="sm:ml-auto flex gap-2 shrink-0">
                  {courseCert && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-1 cursor-pointer border-[var(--brand-border)] text-[var(--text-secondary)]"
                      onClick={() => handleShare(courseCert)}
                    >
                      <Share2 size={13} />
                      <span>Share Verification</span>
                    </Button>
                  )}
                  <Button
                    variant="primary"
                    size="sm"
                    className="flex items-center gap-1 cursor-pointer shadow-lg shadow-[#4A1F4F]/10"
                    onClick={handleDownload}
                    loading={downloading}
                  >
                    <Download size={13} />
                    <span>Download Certificate</span>
                  </Button>
                </div>
              </Card>

              {/* Framed Certificate Preview */}
              <div ref={certificateRef} className="max-w-4xl mx-auto bg-white text-slate-800 rounded-3xl shadow-xl border border-slate-100 p-6 sm:p-12 relative overflow-hidden select-none">
                <div className="border-[8px] border-[#4A1F4F] rounded-2xl p-4 sm:p-8 relative min-h-[460px] flex flex-col justify-between bg-slate-50/20">
                  <div className="absolute inset-2 border border-slate-200 pointer-events-none rounded-lg" />
                  
                  {/* Header Logos */}
                  <div className="flex justify-between items-center z-10">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-[#4A1F4F] flex items-center justify-center text-white font-bold text-lg shadow-sm">
                        L
                      </div>
                      <span className="font-bold text-slate-800 tracking-tight text-xs sm:text-sm">LMS Portal</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-md bg-[#4A1F4F] flex items-center justify-center text-white font-bold text-xs">
                        X
                      </div>
                      <span className="font-bold text-slate-800 tracking-tight text-xs sm:text-sm">Xebia</span>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="text-center my-6 flex-1 flex flex-col justify-center gap-4">
                    <h1 className="font-serif font-black text-2xl sm:text-4xl text-[#4A1F4F] tracking-tight">
                      Certificate of Course Completion
                    </h1>
                    <div className="w-36 h-0.5 bg-purple-200 mx-auto" />
                    <p className="text-slate-400 text-xs sm:text-sm font-medium italic">
                      This is proudly presented to
                    </p>
                    <h2 className="font-bold text-2xl sm:text-3xl text-slate-800 tracking-tight leading-none px-4">
                      {studentName}
                    </h2>
                    <p className="text-slate-500 text-xs sm:text-sm max-w-lg mx-auto leading-relaxed mt-1">
                      for demonstrating outstanding excellence and successfully passing all learning modules in
                    </p>
                    <h3 className="font-bold text-base sm:text-xl text-slate-800 italic leading-none px-4">
                      "{courseName}"
                    </h3>
                    
                    <div className="mt-2 text-xs sm:text-sm text-slate-500 flex flex-col gap-1">
                      <p className="font-bold text-[#2563EB]">
                        Final Grade: {overallPercentage.toFixed(1)}% / 100.0%
                      </p>
                      <p className="text-slate-400">
                        Completion Date: {displayDate}
                      </p>
                    </div>
                  </div>

                  {/* Footer Seal/Stamp */}
                  <div className="flex flex-col sm:flex-row justify-between items-end sm:items-center gap-6 mt-4 pt-4 border-t border-slate-100 z-10">
                    <div className="flex items-center gap-3">
                      {currentCert?.qrCodeUrl ? (
                        <img
                          src={currentCert.qrCodeUrl}
                          alt="Verification QR"
                          className="w-14 h-14 object-contain rounded border border-slate-100 bg-white p-1"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded border border-dashed border-slate-200 bg-slate-50/50 flex flex-col items-center justify-center p-1 text-[7px] text-slate-400 text-center leading-tight">
                          <span>Automatic</span>
                          <span>Verified QR</span>
                        </div>
                      )}
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[8px] uppercase font-bold text-slate-400">Certificate ID</span>
                        <span className="text-[9px] font-mono font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">
                          {currentCert?.certificateId || "CERT-PENDING"}
                        </span>
                      </div>
                    </div>

                    <div className="w-14 h-14 rounded-full bg-yellow-100/50 border-2 border-dashed border-yellow-500/80 flex flex-col items-center justify-center p-1 relative rotate-12 shrink-0">
                      <span className="text-[7px] font-bold text-[#4A1F4F] leading-none">LMS</span>
                      <span className="text-[7px] font-bold text-[#4A1F4F] leading-none">PORTAL</span>
                      <span className="text-[5px] text-yellow-600 font-bold mt-1 tracking-wider uppercase">Certified</span>
                    </div>

                    <div className="flex flex-col items-center gap-1 w-40 shrink-0">
                      <div className="w-full border-b border-slate-300 pb-1 flex flex-col items-center justify-center min-h-[20px]">
                        <span className="font-serif italic text-xs text-indigo-900">
                          {currentCert?.teacherName || "Authorized Instructor"}
                        </span>
                      </div>
                      <div className="text-center">
                        <span className="text-[9px] font-bold text-slate-600 block leading-tight">
                          {currentCert?.teacherName || "Authorized Instructor"}
                        </span>
                        <span className="text-[7px] text-slate-400 block leading-none">
                          LMS Evaluator Signature
                    </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Not Eligible View */
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-5">
                <Card className="p-6 border border-[var(--brand-border)]">
                  <h3 className="text-base font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                    <CheckSquare size={18} className="text-[#4A1F4F]" />
                    <span>Course Completion Checklist</span>
                  </h3>
                  
                  <div className="space-y-4">
                    {/* Rule 1: Assignment Submission Rate */}
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">
                        {assignmentCompletionRate >= config.requiredAssignmentCompletionPct ? (
                          <CheckCircle className="text-emerald-500" size={16} />
                        ) : (
                          <XCircle className="text-rose-500" size={16} />
                        )}
                      </div>
                      <div>
                        <span className={`text-sm font-semibold ${assignmentCompletionRate >= config.requiredAssignmentCompletionPct ? 'text-[var(--text-primary)]' : 'text-slate-500'}`}>
                          Complete required assignments ({config.requiredAssignmentCompletionPct}%)
                        </span>
                        <p className="text-xs text-[var(--text-secondary)]">
                          Submitted {submittedAssignments} out of {totalAssignments} assignments ({Math.round(assignmentCompletionRate)}%). {pendingAssignments > 0 && `(${pendingAssignments} pending)`}
                        </p>
                      </div>
                    </div>

                    {/* Rule 2: Quiz Completion Rate */}
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">
                        {quizCompletionRate >= config.requiredQuizCompletionPct ? (
                          <CheckCircle className="text-emerald-500" size={16} />
                        ) : (
                          <XCircle className="text-rose-500" size={16} />
                        )}
                      </div>
                      <div>
                        <span className={`text-sm font-semibold ${quizCompletionRate >= config.requiredQuizCompletionPct ? 'text-[var(--text-primary)]' : 'text-slate-500'}`}>
                          Complete required quizzes ({config.requiredQuizCompletionPct}%)
                        </span>
                        <p className="text-xs text-[var(--text-secondary)]">
                          Completed {completedQuizzes} out of {totalQuizzes} quizzes ({Math.round(quizCompletionRate)}%). {remainingQuizzes > 0 && `(${remainingQuizzes} remaining)`}
                        </p>
                      </div>
                    </div>

                    {/* Rule 3: Pass marks verification */}
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">
                        {allPassingMarksMet ? (
                          <CheckCircle className="text-emerald-500" size={16} />
                        ) : (
                          <XCircle className="text-rose-500" size={16} />
                        )}
                      </div>
                      <div>
                        <span className={`text-sm font-semibold ${allPassingMarksMet ? 'text-[var(--text-primary)]' : 'text-slate-500'}`}>
                          Achieve individual activity passing marks
                        </span>
                        <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                          Requires securing {config.assignmentPassingMarksPct}% on assignments and {config.quizPassingMarksPct}% on quizzes.
                        </p>
                        {failedPassingTasks.length > 0 && (
                          <div className="mt-2 p-3 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 rounded-xl">
                            <span className="text-[10px] font-bold text-rose-600 block uppercase">Failing or incomplete activities:</span>
                            <ul className="list-disc list-inside mt-1 text-xs text-rose-700 dark:text-rose-400 space-y-1">
                              {failedPassingTasks.map(t => {
                                const obtained = t.submission?.marks ?? null;
                                const max = t.maxMarks;
                                const reqPct = t.assignmentType === 'QUIZ' ? config.quizPassingMarksPct : config.assignmentPassingMarksPct;
                                const passing = max * (reqPct / 100);
                                return (
                                  <li key={t.id}>
                                    <span className="font-semibold">"{t.title}"</span>: {obtained !== null ? `${obtained}/${max} marks (passing: ${passing.toFixed(1)} / ${reqPct}%)` : 'Not submitted yet'}
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Rule 4: Certificate score check */}
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">
                        {isCertEligible ? (
                          <CheckCircle className="text-emerald-500" size={16} />
                        ) : (
                          <XCircle className="text-rose-500" size={16} />
                        )}
                      </div>
                      <div>
                        <span className={`text-sm font-semibold ${isCertEligible ? 'text-[var(--text-primary)]' : 'text-slate-500'}`}>
                          Achieve Certificate Eligibility Marks on all activities
                        </span>
                        <p className="text-xs text-[var(--text-secondary)]">
                          Requires meeting the specific Certificate Eligibility Marks percentage set for each individual assignment/quiz.
                        </p>
                        {failedCertEligibilityTasks.length > 0 && (
                          <div className="mt-2 p-3 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 rounded-xl">
                            <span className="text-[10px] font-bold text-rose-600 block uppercase">Below Certificate Eligibility Threshold:</span>
                            <ul className="list-disc list-inside mt-1 text-xs text-rose-700 dark:text-rose-400 space-y-1">
                              {failedCertEligibilityTasks.map(t => {
                                const obtained = t.submission?.marks ?? null;
                                const max = t.maxMarks;
                                const certPct = parseTaskCertEligibility(t.instructions);
                                const certMarks = max * (certPct / 100);
                                return (
                                  <li key={t.id}>
                                    <span className="font-semibold">"{t.title}"</span>: {obtained !== null ? `${obtained}/${max} marks (threshold: ${certMarks.toFixed(1)} / ${certPct}%)` : 'Not submitted yet'}
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Status explanation block */}
              <div className="space-y-5">
                <Card className="p-6 border border-rose-100 dark:border-rose-900/20 bg-rose-50/20 dark:bg-rose-950/5 flex flex-col p-6 min-h-[300px] justify-between">
                  <div className="text-center flex flex-col items-center">
                    <div className="w-14 h-14 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-500 mb-4">
                      <AlertCircle size={28} />
                    </div>
                    <h4 className="text-sm font-bold text-[var(--text-primary)] mb-1">Certificate Locked</h4>
                    <p className="text-xs text-[var(--text-secondary)] max-w-[220px] leading-relaxed">
                      You passed the base requirements but did not qualify for a certificate.
                    </p>
                  </div>

                  <div className="mt-4 border-t border-[var(--brand-border)] pt-4 text-xs space-y-2 select-none">
                    <div className="flex justify-between">
                      <span className="text-[var(--text-secondary)]">Course Result:</span>
                      <span className={`font-bold ${isCoursePassed ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {isCoursePassed ? 'Passed' : 'Failed / In Progress'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--text-secondary)]">Certificate Eligibility:</span>
                      <span className="font-bold text-rose-600">Not Eligible</span>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-xl border border-[var(--brand-border)] mt-2 text-[10px] leading-relaxed text-[var(--text-secondary)]">
                      <span className="font-bold text-[var(--text-primary)]">Reason:</span>
                      <p className="mt-0.5">
                        {!allTasksCompleted 
                          ? 'All required assignments and quizzes must be 100% completed to qualify for certificate generation.'
                          : `You have ${failedCertEligibilityTasks.length} activity scores falling below their configured Certificate Eligibility Marks.`
                        }
                      </p>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          )}
        </>
      )}
    </Layout>
  );
};
