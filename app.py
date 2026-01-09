from flask import Flask, render_template, jsonify
import pandas as pd
from collections import Counter

app = Flask(__name__)

# Load the data and clean column names (remove leading/trailing spaces)
df = pd.read_csv('normalized_data (1).csv')
df.columns = df.columns.str.strip()

# Print loaded data info for debugging
print(f"Loaded {len(df)} student records")
print(f"Columns: {list(df.columns)}")

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/debug')
def debug():
    return render_template('debug.html')

@app.route('/test')
def test():
    return render_template('test.html')

@app.route('/api/data')
def get_data():
    """Return all data as JSON"""
    # Replace NaN with None (which becomes null in JSON)
    data = df.fillna('').to_dict('records')
    return jsonify(data)

@app.route('/api/summary')
def get_summary():
    """Return summary statistics"""
    
    # Calculate summary with proper column names
    summary = {
        'total_students': int(len(df)),
        'majors': {str(k): int(v) for k, v in df['Major'].value_counts().to_dict().items()},
        'years': {str(k): int(v) for k, v in df['Current year of study'].value_counts().to_dict().items()},
        'gpa_distribution': {str(k): int(v) for k, v in df['GPA range'].value_counts().to_dict().items()},
        'attendance_behavior': {str(k): int(v) for k, v in df['Class attendance behavior'].value_counts().to_dict().items()},
        'gender_distribution': {str(k): int(v) for k, v in df['Gender'].value_counts().to_dict().items()},
        'attendance_gpa_relationship': {str(k): int(v) for k, v in df['Relationship between class attendance and GPA'].value_counts().to_dict().items()},
        'learning_methods': {str(k): int(v) for k, v in df['Effective learning methods for academic performance'].value_counts().to_dict().items()},
        'attendance_frequency': {str(k): int(v) for k, v in df['Frequency of optional attendance'].value_counts().to_dict().items()}
    }
    
    return jsonify(summary)

@app.route('/api/attendance_by_major')
def attendance_by_major():
    """Get attendance patterns by major"""
    result = df.groupby(['Major', 'Class attendance behavior']).size().reset_index(name='count')
    return jsonify(result.fillna('').to_dict('records'))

@app.route('/api/gpa_by_attendance')
def gpa_by_attendance():
    """Get GPA distribution by attendance behavior"""
    result = df.groupby(['Class attendance behavior', 'GPA range']).size().reset_index(name='count')
    return jsonify(result.fillna('').to_dict('records'))

@app.route('/api/reasons_analysis')
def reasons_analysis():
    """Analyze reasons for attending and skipping"""
    attending_reasons = []
    skipping_reasons = []
    
    # Parse attending reasons (semicolon-separated values)
    for reason in df['Reasons for attending classes?'].dropna():
        reason_str = str(reason).strip()
        if not reason_str or reason_str == 'nan':
            continue
        if ';' in reason_str:
            attending_reasons.extend([r.strip() for r in reason_str.split(';') if r.strip()])
        else:
            attending_reasons.append(reason_str)
    
    # Parse skipping reasons (semicolon-separated values)
    for reason in df['Reasons for skipping classes'].dropna():
        reason_str = str(reason).strip()
        if not reason_str or reason_str == 'nan':
            continue
        if ';' in reason_str:
            skipping_reasons.extend([r.strip() for r in reason_str.split(';') if r.strip()])
        else:
            skipping_reasons.append(reason_str)
    
    # Count and return top reasons
    attending_counts = Counter(attending_reasons).most_common(10)
    skipping_counts = Counter(skipping_reasons).most_common(10)
    
    return jsonify({
        'attending': {reason: count for reason, count in attending_counts},
        'skipping': {reason: count for reason, count in skipping_counts}
    })

@app.route('/api/year_wise_analysis')
def year_wise_analysis():
    """Analyze attendance patterns across different years"""
    result = df.groupby(['Current year of study', 'Class attendance behavior']).size().reset_index(name='count')
    return jsonify(result.fillna('').to_dict('records'))

@app.route('/api/factors_influencing')
def factors_influencing():
    """Analyze factors influencing attendance"""
    factors = []
    
    # Label mappings for factors
    label_map = {
        'Practical application of course content (e.g., examples, case studies, problem-solving)': 'Practical application',
        'Quality and clarity of instruction during lectures': 'Instruction quality',
        'Opportunities for in-class discussion to better understand theoretical concepts': 'Class discussion',
        'Ability to choose class schedules and/or instructors': 'Schedules/instructor choice',
        'Relevance of lectures to examinations and assessments': 'Exam relevance',
        'None of these factors would influence my decision to attend classes': 'No influence',
        'all': 'Others',
        'How much the lecturer is serious and passionate about the material and delivering it': 'Others',
        'How much the lecturer is serious and passionate about the material and delivering it ': 'Others'
    }
    
    for factor in df['Factors  influencing attendance'].dropna():
        factor_str = str(factor).strip()
        if not factor_str or factor_str == 'nan':
            continue
        if ';' in factor_str:
            for f in factor_str.split(';'):
                f = f.strip()
                if f:
                    # Apply label mapping
                    mapped_factor = label_map.get(f, f)
                    factors.append(mapped_factor)
        else:
            # Apply label mapping
            mapped_factor = label_map.get(factor_str, factor_str)
            factors.append(mapped_factor)
    
    factor_counts = Counter(factors).most_common(10)
    return jsonify({factor: count for factor, count in factor_counts})

@app.route('/api/compensation_methods')
def compensation_methods():
    """Analyze ways of compensation for missed content"""
    methods = []
    
    # Label mappings for compensation methods
    label_map = {
        'Review lecture slides or PDF materials': 'Review slides/PDFs',
        'Watch educational videos (e.g., YouTube)': 'Watch videos',
        'Consult classmates\' notes': 'Consult classmates\' notes',
        'Use AI-based tools for learning support (e.g., ChatGPT)': 'Use AI tools',
        'Watch recorded lectures, if available': 'Watch recorded lectures',
        'Rely on explanations provided by classmates or peers': 'Peer explanations',
        'I usually do not compensate for missed classes': 'No catch-up'
    }
    
    for method in df['Ways of compensation for the missed content?'].dropna():
        method_str = str(method).strip()
        if not method_str or method_str == 'nan':
            continue
        if ';' in method_str:
            for m in method_str.split(';'):
                m = m.strip()
                if m:
                    # Apply label mapping
                    mapped_method = label_map.get(m, m)
                    methods.append(mapped_method)
        else:
            # Apply label mapping
            mapped_method = label_map.get(method_str, method_str)
            methods.append(mapped_method)
    
    method_counts = Counter(methods).most_common(10)
    return jsonify({method: count for method, count in method_counts})

@app.route('/api/attitude')
def get_attitude():
    """Get attitude toward attending classes distribution"""
    attitude_counts = df['Attitude toward attending classes'].value_counts().to_dict()
    return jsonify({str(k): int(v) for k, v in attitude_counts.items()})

@app.route('/api/effectiveness')
def get_effectiveness():
    """Get effectiveness of alternative methods"""
    effectiveness_counts = df['Effectiveness of alternative methods compared to attending classes'].value_counts().to_dict()
    return jsonify({str(k): int(v) for k, v in effectiveness_counts.items()})

@app.route('/api/optional_frequency')
def get_optional_frequency():
    """Get frequency of optional attendance distribution"""
    frequency_counts = df['Frequency of optional attendance'].value_counts().to_dict()
    return jsonify({str(k): int(v) for k, v in frequency_counts.items()})

if __name__ == '__main__':
    app.run(debug=True, port=5000)