import React, { useCallback, useRef, useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import { Upload, X, ArrowLeft, ChevronDown, Search, BookOpen, Calendar, Clock, Users, FileText, Settings, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Layout } from '../../components/layout/Layout';
import { Button } from '../../components/ui/Button';
import { Input, Textarea } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';
import { SubjectSelector } from '../../components/shared/SubjectSelector';
import { teacherService } from '../../services/teacher.service';
import { getFileIcon } from '../../utils/helpers';
import { useAppDispatch, useAppSelector } from '../../store';
import { getAllBatches } from '../../store/batchSlice';

const schema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  subject: z.string().min(1, 'Subject is required'),
  topic: z.string().optional(),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  instructions: z.string().optional(),
  dueDate: z.string().min(1, 'Due date is required'),
  maxMarks: z.string().min(1, 'Marks are required').refine((v) => !isNaN(Number(v)) && Number(v) >= 1 && Number(v) <= 1000, 'Marks must be between 1 and 1000'),
  passingMarks: z.string().min(1, 'Passing marks are required').refine((v) => !isNaN(Number(v)) && Number(v) >= 0, 'Must be a positive number'),
  certEligibilityMarks: z.string().min(1, 'Certificate eligibility marks are required').refine((v) => !isNaN(Number(v)) && Number(v) >= 0 && Number(v) <= 100, 'Must be a percentage between 0 and 100'),
  batchId: z.string().min(1, 'Batch selection is required'),
});

type FormData = z.infer<typeof schema>;

export const CreateAssignment: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [searchParams] = useSearchParams(); // Fixed import
  const forcedType = searchParams?.get('type')?.toUpperCase(); // 'PDF' or 'QUIZ'

  const { batches } = useAppSelector((state) => state.batch);
  const [loading, setLoading] = useState(false);
  
  const assignmentType = 'PDF';

  useEffect(() => {
    if (forcedType === 'QUIZ') {
      // Quiz creation has moved to the Quizzes panel
      navigate('/teacher/quizzes?create=1');
    }
  }, [forcedType, navigate]);
  
  // Standard uploader states
  const [attachment, setAttachment] = useState<File | null>(null);
  const [existingAttachment, setExistingAttachment] = useState<string | null>(null);
  const [existingAttachmentName, setExistingAttachmentName] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Searchable Batch Dropdown states
  const [batchSearch, setBatchSearch] = useState('');
  const [batchOpen, setBatchOpen] = useState(false);
  const [selectedBatchName, setSelectedBatchName] = useState('');

  const { register, handleSubmit, setValue, watch, reset, control, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { maxMarks: '100', passingMarks: '40', certEligibilityMarks: '75', batchId: '' },
  });

  const watchBatchId = watch('batchId');
  const watchMaxMarks = watch('maxMarks');

  useEffect(() => {
    if (watchMaxMarks && !isNaN(Number(watchMaxMarks))) {
      setValue('passingMarks', String(Math.round(Number(watchMaxMarks) * 0.4)));
    }
  }, [watchMaxMarks, setValue]);

  // Fetch batches on mount
  useEffect(() => {
    dispatch(getAllBatches());
  }, [dispatch]);

  // Load assignment detail if in edit mode
  useEffect(() => {
    if (isEdit && id) {
      setLoading(true);
      teacherService.getAssignmentById(id)
        .then((res) => {
          let cleanInst = res.instructions || '';
          let certPct = '75';
          if (res.instructions && res.instructions.trim().startsWith('{')) {
            try {
              const meta = JSON.parse(res.instructions);
              cleanInst = meta.realInstructions || '';
              certPct = String(meta.certEligibilityMarks !== undefined ? meta.certEligibilityMarks : 75);
            } catch {}
          } else {
            const match = (res.instructions || '').match(/\[CERT_ELIGIBILITY:(\d+)\]/);
            if (match) {
              certPct = match[1];
              cleanInst = (res.instructions || '').replace(/\[CERT_ELIGIBILITY:\d+\]/, '').trim();
            }
          }

          reset({
            title: res.title,
            subject: res.subject,
            topic: res.topic || '',
            description: res.description,
            instructions: cleanInst,
            dueDate: res.dueDate,
            maxMarks: String(res.maxMarks),
            passingMarks: String(res.passingMarks !== undefined ? res.passingMarks : Math.round(res.maxMarks * 0.4)),
            certEligibilityMarks: certPct,
            batchId: String(res.batchId || ''),
          });
          if (res.batchName) {
            setSelectedBatchName(res.batchName);
          }
          if (res.attachment) {
            setExistingAttachment(res.attachment);
            setExistingAttachmentName(res.attachmentName || 'attachment');
          }
        })
        .catch(() => toast.error('Failed to load assignment details'))
        .finally(() => setLoading(false));
    }
  }, [id, isEdit, reset]);

  // Sync selectedBatchName when batches load or watchBatchId changes
  useEffect(() => {
    if (watchBatchId && batches.length > 0) {
      const found = batches.find((b) => String(b.id) === watchBatchId);
      if (found) {
        setSelectedBatchName(found.batchName);
      }
    }
  }, [watchBatchId, batches]);

  // Standard File drop zone handler
  const handleFile = (file: File) => {
    const allowed = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/zip', 'application/x-zip-compressed', 'image/jpeg', 'image/png'];
    if (!allowed.includes(file.type)) {
      toast.error('Invalid file type. Allowed: PDF, DOC, DOCX, ZIP, JPG, PNG');
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      toast.error('File too large. Maximum 25MB allowed.');
      return;
    }
    setAttachment(file);
    setExistingAttachment(null);
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, []);

  const onSubmit = async (data: FormData, status: 'draft' | 'published') => {
    const finalMaxMarks = Number(data.maxMarks);
    const finalPassingMarks = Number(data.passingMarks);
    
    // Serialize eligibility marks into instructions metadata
    const instructionsData = JSON.stringify({
      realInstructions: data.instructions || '',
      certEligibilityMarks: Number(data.certEligibilityMarks)
    });

    try {
      if (isEdit && id) {
        await teacherService.updateAssignment(id, {
          title: data.title,
          subject: data.subject,
          topic: data.topic || '',
          description: data.description,
          instructions: instructionsData,
          dueDate: data.dueDate,
          maxMarks: finalMaxMarks,
          passingMarks: finalPassingMarks,
          status,
          batchId: data.batchId,
          attachment: attachment || undefined,
          assignmentType,
        });
        toast.success('Assignment updated successfully!');
      } else {
        await teacherService.createAssignment({
          title: data.title,
          subject: data.subject,
          topic: data.topic || '',
          description: data.description,
          instructions: instructionsData,
          dueDate: data.dueDate,
          maxMarks: finalMaxMarks,
          passingMarks: finalPassingMarks,
          status,
          batchId: data.batchId,
          attachment: attachment || undefined,
          assignmentType,
        });
        toast.success(status === 'published' ? 'Assignment published!' : 'Assignment saved as draft!');
      }
      navigate('/teacher/assignments');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save assignment.');
    }
  };

  const today = new Date().toISOString().split('T')[0];

  const filteredBatches = batches.filter((b) =>
    b.batchName.toLowerCase().includes(batchSearch.toLowerCase())
  );

  if (loading) {
    return (
      <Layout role="teacher" title={isEdit ? 'Edit Assignment' : 'Create Assignment'}>
        <div className="max-w-3xl mx-auto space-y-4 animate-pulse">
          <div className="bg-white dark:bg-[#1E293B] border border-[var(--brand-border)] rounded-2xl p-5 space-y-3">
            <div className="skeleton h-5 w-1/2 rounded" />
            <div className="skeleton h-3 w-full rounded" />
            <div className="skeleton h-3 w-3/4 rounded" />
          </div>
        </div>
      </Layout>
    );
  }

  const pageTitle = isEdit ? 'Edit Assignment' : 'Create Assignment';

  return (
    <Layout role="teacher" title={pageTitle} subtitle="Fill in the details below">
      <div className="max-w-7xl mx-auto pb-24 px-4 sm:px-6 lg:px-8">
        <button
          onClick={() => navigate('/teacher/assignments')}
          className="flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] mb-6 cursor-pointer transition-colors"
        >
          <ArrowLeft size={16} /> Back to Assignments
        </button>

        <form className="grid grid-cols-1 lg:grid-cols-3 gap-6" onSubmit={(e) => e.preventDefault()}>
          {/* Left Main Form Section */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="rounded-[18px] shadow-sm bg-white dark:bg-slate-900 border border-[var(--brand-border)] p-6">
              <h3 className="text-sm font-bold text-[var(--text-primary)] mb-5 pb-3 border-b border-[var(--brand-border)] flex items-center gap-2.5">
                <FileText size={18} className="text-[#6C1D5F] dark:text-purple-400" />
                Basic Information
              </h3>
              <div className="space-y-4">
                <Input 
                  label="Assignment Title" 
                  placeholder="e.g. Chapter 5 — Newton's Laws" 
                  required 
                  error={errors.title?.message} 
                  {...register('title')} 
                />
                
                <Input 
                  label="Topic" 
                  placeholder="e.g. Laws of Motion" 
                  error={errors.topic?.message} 
                  {...register('topic')} 
                />

                <Textarea
                  label="Description"
                  placeholder="Describe what this assignment is about..."
                  required
                  rows={4}
                  error={errors.description?.message}
                  {...register('description')}
                />
                
                <Textarea
                  label="Instructions (Optional)"
                  placeholder="Detailed instructions for students..."
                  rows={3}
                  error={errors.instructions?.message}
                  {...register('instructions')}
                />
              </div>
            </Card>

            <Card className="rounded-[18px] shadow-sm bg-white dark:bg-slate-900 border border-[var(--brand-border)] p-6">
              <h3 className="text-sm font-bold text-[var(--text-primary)] mb-4 pb-3 border-b border-[var(--brand-border)] flex items-center gap-2.5">
                <Upload size={18} className="text-[#6C1D5F] dark:text-purple-400" />
                Attachment (Optional)
              </h3>

              {attachment ? (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-[#6C1D5F]/5 border border-[#6C1D5F]/20">
                  <span className="text-2xl">{getFileIcon(attachment.name)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--text-primary)] truncate">{attachment.name}</p>
                    <p className="text-xs text-[var(--text-secondary)]">{(attachment.size / 1024).toFixed(0)} KB</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAttachment(null)}
                    className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:bg-[#F5EAF8] hover:text-red-500 dark:hover:bg-[#F5EAF8]0/10 transition-colors cursor-pointer"
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : existingAttachment ? (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-blue-500/5 border border-blue-200 dark:border-teal-500/20">
                  <span className="text-2xl">{getFileIcon(existingAttachmentName || '')}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--text-primary)] truncate">{existingAttachmentName}</p>
                    <p className="text-xs text-[var(--text-secondary)]">Currently uploaded resource</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setExistingAttachment(null)}
                    className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:bg-[#F5EAF8] hover:text-red-500 dark:hover:bg-[#F5EAF8]0/10 transition-colors cursor-pointer"
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <div
                  className={`drop-zone ${isDragging ? 'dragging' : ''} p-8 text-center border-2 border-dashed border-[var(--brand-border)] hover:border-slate-350 dark:hover:border-slate-700 rounded-[16px] transition-all cursor-pointer`}
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={onDrop}
                  onClick={() => fileRef.current?.click()}
                >
                  <div className="w-12 h-12 rounded-2xl bg-[#6C1D5F]/10 flex items-center justify-center mx-auto mb-3">
                    <Upload size={22} className="text-[#6C1D5F] dark:text-purple-400" />
                  </div>
                  <p className="text-sm font-medium text-[var(--text-primary)]">
                    Drop file here or <span className="text-[#6C1D5F] dark:text-purple-400">browse</span>
                  </p>
                  <p className="text-xs text-[var(--text-secondary)] mt-1">PDF, DOC, DOCX, ZIP, JPG, PNG · Max 25MB</p>
                  <input
                    ref={fileRef}
                    type="file"
                    className="hidden"
                    accept=".pdf,.doc,.docx,.zip,.jpg,.jpeg,.png"
                    onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }}
                  />
                </div>
              )}
            </Card>
          </div>

          {/* Right Secondary Settings Section */}
          <div className="space-y-6">
            <Card className="rounded-[18px] shadow-sm bg-white dark:bg-slate-900 border border-[var(--brand-border)] p-6">
              <h3 className="text-sm font-bold text-[var(--text-primary)] mb-4 pb-3 border-b border-[var(--brand-border)] flex items-center gap-2.5">
                <Settings size={18} className="text-[#6C1D5F] dark:text-purple-400" />
                Settings
              </h3>
              <div className="space-y-4">
                <Input
                  label="Due Date"
                  type="date"
                  required
                  min={today}
                  error={errors.dueDate?.message}
                  {...register('dueDate')}
                />
                <Input
                  label="Total Marks"
                  type="number"
                  min={1}
                  max={1000}
                  required
                  error={errors.maxMarks?.message}
                  {...register('maxMarks')}
                />
                <Input
                  label="Passing Marks"
                  type="number"
                  required
                  error={errors.passingMarks?.message}
                  {...register('passingMarks')}
                />
                <div>
                  <Input
                    label="Certificate Eligibility Marks (%)"
                    type="number"
                    min={0}
                    max={100}
                    required
                    error={errors.certEligibilityMarks?.message}
                    {...register('certEligibilityMarks')}
                  />
                  <p className="text-[10px] text-[var(--text-secondary)] mt-2 leading-relaxed">
                    Students must achieve at least these marks to become eligible for course certificate generation.
                  </p>
                </div>
              </div>
            </Card>

            <Card className="rounded-[18px] shadow-sm bg-white dark:bg-slate-900 border border-[var(--brand-border)] p-6">
              <h3 className="text-sm font-bold text-[var(--text-primary)] mb-4 pb-3 border-b border-[var(--brand-border)] flex items-center gap-2.5">
                <Users size={18} className="text-[#6C1D5F] dark:text-purple-400" />
                Batch & Subject
              </h3>
              <div className="space-y-4">
                {/* Searchable Batch Dropdown */}
                <div className="relative">
                  <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider block mb-1.5">
                    Batch <span className="text-red-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setBatchOpen(!batchOpen)}
                    className="w-full bg-white dark:bg-[#1E293B] border border-[var(--brand-border)] focus:border-[#6C1D5F] text-[var(--text-primary)] rounded-xl py-2.5 px-3.5 text-left text-sm flex items-center justify-between cursor-pointer"
                  >
                    <span className="truncate">{selectedBatchName || 'Select a batch'}</span>
                    <ChevronDown size={16} className="text-[var(--text-secondary)] shrink-0" />
                  </button>
                  {batchOpen && (
                    <div className="absolute z-20 mt-1 w-full bg-white dark:bg-[#1E293B] border border-[var(--brand-border)] rounded-xl shadow-lg p-2 space-y-2">
                      {batches.length > 5 && (
                        <div className="relative">
                          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
                          <input
                            type="text"
                            placeholder="Search batch..."
                            value={batchSearch}
                            onChange={(e) => setBatchSearch(e.target.value)}
                            className="w-full bg-slate-50 dark:bg-slate-800 border border-[var(--brand-border)] focus:border-[#6C1D5F] rounded-lg py-1.5 pl-8 pr-3 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] transition-colors"
                          />
                        </div>
                      )}
                      <div className="max-h-60 overflow-y-auto space-y-1">
                        {filteredBatches.length === 0 ? (
                          <p className="text-xs text-[var(--text-secondary)] text-center py-2">No batches found</p>
                        ) : (
                          filteredBatches.map((b) => (
                            <button
                              key={b.id}
                              type="button"
                              onClick={() => {
                                setValue('batchId', String(b.id));
                                setSelectedBatchName(b.batchName);
                                setBatchOpen(false);
                              }}
                              className={`w-full text-left px-3 py-2 rounded-lg text-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${
                                watchBatchId === String(b.id) ? 'bg-[#6C1D5F10] text-[#6C1D5F] font-semibold' : 'text-[var(--text-primary)]'
                              }`}
                            >
                              {b.batchName}
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                  {errors.batchId?.message && <p className="text-xs text-red-500 mt-1">{errors.batchId.message}</p>}
                </div>

                {/* Subject Selector */}
                <Controller
                  name="subject"
                  control={control}
                  render={({ field }) => (
                    <SubjectSelector
                      value={field.value}
                      onChange={field.onChange}
                      error={errors.subject?.message}
                      required
                    />
                  )}
                />
              </div>
            </Card>
          </div>

          {/* Sticky Bottom Action Bar */}
          <div className="fixed bottom-0 left-0 right-0 lg:pl-64 bg-white dark:bg-[#1E293B]/95 border-t border-[var(--brand-border)] py-4 px-6 md:px-8 shadow-[0_-4px_12px_rgba(0,0,0,0.05)] z-40 flex items-center justify-between backdrop-blur-sm select-none">
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={() => navigate('/teacher/assignments')}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                size="lg"
                loading={isSubmitting}
                onClick={() => handleSubmit((d: FormData) => onSubmit(d, 'draft'))()}
              >
                Save Draft
              </Button>
              <Button
                type="button"
                variant="primary"
                size="lg"
                loading={isSubmitting}
                onClick={() => handleSubmit((d: FormData) => onSubmit(d, 'published'))()} 
              >
                {isEdit ? 'Save Changes' : 'Publish Assignment'}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </Layout>
  );
};